from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import imports
from app.schemas.imports import ImportBatchUpdate, ImportItemParsed
from app.services.currency import get_exchange_rates


def _compute_margin(
    source_price_base: float,
    match_price_base: float,
    is_sell: bool,
    *,
    same_type: bool = False,
) -> float | None:
    """Margin formula used by both batch-level SQL and per-item Python paths.

    Cross-type (BUY/SELL):
        (sell - buy) / sell * 100
    Same-type (SELL/SELL or BUY/BUY):
        (match - source) / source * 100  (price difference %)
    """
    if same_type:
        if source_price_base == 0:
            return None
        return (match_price_base - source_price_base) / source_price_base * 100

    if is_sell:
        if source_price_base == 0:
            return None
        return (source_price_base - match_price_base) / source_price_base * 100

    if match_price_base == 0:
        return None

    return (match_price_base - source_price_base) / match_price_base * 100


def list_batches(
    db: Session, skip: int, limit: int
) -> tuple[list[imports.ImportBatch], int]:
    total = db.execute(select(func.count()).select_from(imports.ImportBatch)).scalar()

    batches = (
        db.execute(
            select(imports.ImportBatch)
            .order_by(imports.ImportBatch.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    return list(batches), total or 0


def get_batch(db: Session, batch_id: int) -> imports.ImportBatch | None:
    return db.execute(
        select(imports.ImportBatch).where(imports.ImportBatch.id == batch_id)
    ).scalar_one_or_none()


def get_batch_items(
    db: Session,
    batch_id: int,
    skip: int,
    limit: int,
    sort_by_margin: bool,
    compare_with: str | None = None,
    focus_item_id: int | None = None,
) -> tuple[list[dict], int, int]:
    batch = db.execute(
        select(imports.ImportBatch).where(imports.ImportBatch.id == batch_id)
    ).scalar_one_or_none()

    if not batch:
        return [], 0, skip

    total = db.execute(
        select(func.count())
        .select_from(imports.ImportItem)
        .where(imports.ImportItem.batch_id == batch_id)
    ).scalar()

    same_type = compare_with == batch.sheet_type.value

    if same_type:
        target_type = batch.sheet_type
        # SELL/SELL: highest competitor first; BUY/BUY: cheapest alternative first
        sort_order = (
            imports.ImportItem.price.desc()
            if batch.sheet_type == imports.SheetType.SELL
            else imports.ImportItem.price.asc()
        )
    elif batch.sheet_type == imports.SheetType.SELL:
        target_type = imports.SheetType.BUY
        sort_order = imports.ImportItem.price.asc()
    else:
        target_type = imports.SheetType.SELL
        sort_order = imports.ImportItem.price.desc()

    comp_filter = imports.ImportBatch.sheet_type == target_type
    if same_type:
        comp_filter = comp_filter & (imports.ImportBatch.id != batch_id)

    best_comp_subq = (
        select(
            imports.ImportItem.ean,
            imports.ImportItem.price.label("comparison_price"),
            imports.ImportBatch.supplier_name.label("comparison_supplier"),
            imports.ImportBatch.id.label("comparison_batch_id"),
            imports.ImportBatch.currency.label("comparison_currency"),
        )
        .join(imports.ImportBatch)
        .where(comp_filter)
        .distinct(imports.ImportItem.ean)
        .order_by(imports.ImportItem.ean, sort_order)
        .subquery()
    )

    rates = get_exchange_rates()
    anchor_multiplier = rates.get(batch.currency.value, 1.0)
    anchor_price_base = imports.ImportItem.price * anchor_multiplier

    comp_rate_case = case(
        *[
            (best_comp_subq.c.comparison_currency == currency, rate)
            for currency, rate in rates.items()
        ],
        else_=1.0,
    )
    comp_price_base = best_comp_subq.c.comparison_price * comp_rate_case

    # SQL mirror of _compute_margin() — keep in sync
    if same_type:
        margin_expr = (
            (comp_price_base - anchor_price_base) / func.nullif(anchor_price_base, 0)
        ) * 100
    elif batch.sheet_type == imports.SheetType.SELL:
        margin_expr = (
            (anchor_price_base - comp_price_base) / func.nullif(anchor_price_base, 0)
        ) * 100
    else:
        margin_expr = (
            (comp_price_base - anchor_price_base) / func.nullif(comp_price_base, 0)
        ) * 100

    query = (
        select(
            imports.ImportItem.id,
            imports.ImportItem.ean,
            imports.ImportItem.product_name,
            imports.ImportItem.price,
            best_comp_subq.c.comparison_price,
            best_comp_subq.c.comparison_supplier,
            best_comp_subq.c.comparison_batch_id,
            best_comp_subq.c.comparison_currency,
            margin_expr.label("margin_percentage"),
        )
        .outerjoin(best_comp_subq, imports.ImportItem.ean == best_comp_subq.c.ean)
        .where(imports.ImportItem.batch_id == batch_id)
    )

    if sort_by_margin:
        query = query.order_by(margin_expr.desc().nulls_last())
    else:
        query = query.order_by(imports.ImportItem.id.asc())

    if focus_item_id is not None:
        id_query = (
            select(imports.ImportItem.id)
            .outerjoin(best_comp_subq, imports.ImportItem.ean == best_comp_subq.c.ean)
            .where(imports.ImportItem.batch_id == batch_id)
        )
        if sort_by_margin:
            id_query = id_query.order_by(margin_expr.desc().nulls_last())
        else:
            id_query = id_query.order_by(imports.ImportItem.id.asc())

        all_ids = [row.id for row in db.execute(id_query).all()]
        try:
            position = all_ids.index(focus_item_id)
            skip = (position // limit) * limit
        except ValueError:
            pass

    raw_items = db.execute(query.offset(skip).limit(limit)).all()

    results = [
        {
            "id": row.id,
            "ean": row.ean,
            "product_name": row.product_name,
            "price": row.price,
            "comparison_price": row.comparison_price,
            "comparison_supplier": row.comparison_supplier,
            "comparison_batch_id": row.comparison_batch_id,
            "comparison_currency": row.comparison_currency,
            "margin_percentage": round(row.margin_percentage, 2)
            if row.margin_percentage is not None
            else None,
        }
        for row in raw_items
    ]

    return results, total, skip


def get_item_matches(
    db: Session,
    batch_id: int,
    item_id: int,
    compare_with: str | None = None,
) -> tuple[dict, list[dict]] | None:
    source_item = db.execute(
        select(imports.ImportItem).where(
            imports.ImportItem.id == item_id,
            imports.ImportItem.batch_id == batch_id,
        )
    ).scalar_one_or_none()

    if not source_item:
        return None

    source_batch = db.execute(
        select(imports.ImportBatch).where(imports.ImportBatch.id == batch_id)
    ).scalar_one_or_none()

    if not source_batch:
        return None

    same_type = compare_with == source_batch.sheet_type.value

    if same_type:
        target_type = source_batch.sheet_type
        sort_order = (
            imports.ImportItem.price.desc()
            if source_batch.sheet_type == imports.SheetType.SELL
            else imports.ImportItem.price.asc()
        )
    elif source_batch.sheet_type == imports.SheetType.SELL:
        target_type = imports.SheetType.BUY
        sort_order = imports.ImportItem.price.asc()
    else:
        target_type = imports.SheetType.SELL
        sort_order = imports.ImportItem.price.desc()

    match_filter = [
        imports.ImportItem.ean == source_item.ean,
        imports.ImportBatch.sheet_type == target_type,
    ]
    if same_type:
        match_filter.append(imports.ImportBatch.id != batch_id)

    raw_matches = db.execute(
        select(
            imports.ImportItem.id,
            imports.ImportItem.product_name,
            imports.ImportItem.price,
            imports.ImportBatch.id.label("batch_id"),
            imports.ImportBatch.filename.label("batch_filename"),
            imports.ImportBatch.supplier_name,
            imports.ImportBatch.currency,
        )
        .join(imports.ImportBatch)
        .where(*match_filter)
        .order_by(sort_order)
    ).all()

    rates = get_exchange_rates()
    source_rate = rates.get(source_batch.currency.value, 1.0)
    source_price_base = float(source_item.price) * source_rate

    is_sell = source_batch.sheet_type == imports.SheetType.SELL

    matches = []
    for row in raw_matches:
        currency_val = (
            row.currency.value
            if isinstance(row.currency, imports.Currency)
            else row.currency
        )
        match_rate = rates.get(currency_val, 1.0)
        match_price_base = float(row.price) * match_rate

        margin = _compute_margin(
            source_price_base, match_price_base, is_sell, same_type=same_type
        )

        matches.append(
            {
                "item_id": row.id,
                "product_name": row.product_name,
                "price": float(row.price),
                "batch_id": row.batch_id,
                "batch_filename": row.batch_filename,
                "supplier_name": row.supplier_name,
                "currency": currency_val,
                "margin_percentage": round(margin, 2) if margin is not None else None,
            }
        )

    source = {
        "item_id": source_item.id,
        "ean": source_item.ean,
        "product_name": source_item.product_name,
        "price": float(source_item.price),
        "currency": source_batch.currency.value,
        "sheet_type": source_batch.sheet_type.value,
    }

    return source, matches


def create_batch(
    db: Session,
    filename: str,
    supplier_name: str,
    sheet_type: imports.SheetType,
    stock_type: imports.StockType,
    currency: imports.Currency,
    description: str | None,
    parsed_items: list[ImportItemParsed],
) -> tuple[int, int]:
    new_batch = imports.ImportBatch(
        filename=filename,
        supplier_name=supplier_name,
        sheet_type=sheet_type,
        stock_type=stock_type,
        currency=currency,
        description=description,
    )
    db.add(new_batch)
    db.flush()

    db_items = [
        imports.ImportItem(
            batch_id=new_batch.id,
            ean=item.ean,
            product_name=item.product_name,
            price=item.price,
        )
        for item in parsed_items
    ]

    db.add_all(db_items)
    db.commit()

    return new_batch.id, len(db_items)


def update_batch(
    db: Session, batch_id: int, update_data: ImportBatchUpdate
) -> imports.ImportBatch | None:
    batch = db.execute(
        select(imports.ImportBatch).where(imports.ImportBatch.id == batch_id)
    ).scalar_one_or_none()

    if not batch:
        return None

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(batch, field, value)

    db.commit()
    db.refresh(batch)

    return batch


def delete_batch(db: Session, batch_id: int) -> bool:
    batch = db.execute(
        select(imports.ImportBatch).where(imports.ImportBatch.id == batch_id)
    ).scalar_one_or_none()

    if not batch:
        return False

    db.delete(batch)
    db.commit()

    return True
