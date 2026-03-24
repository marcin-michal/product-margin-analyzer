from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import imports
from app.schemas.imports import ImportBatchUpdate, ImportItemParsed
from app.services.currency import get_exchange_rates


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


def get_batch_items(
    db: Session, batch_id: int, skip: int, limit: int, sort_by_margin: bool
) -> tuple[list[dict], int]:
    batch = db.execute(
        select(imports.ImportBatch).where(imports.ImportBatch.id == batch_id)
    ).scalar_one_or_none()

    if not batch:
        return [], 0

    total = db.execute(
        select(func.count())
        .select_from(imports.ImportItem)
        .where(imports.ImportItem.batch_id == batch_id)
    ).scalar()

    if batch.sheet_type == imports.SheetType.SELL:
        opposite_type = imports.SheetType.BUY
        sort_order = imports.ImportItem.price.asc()
    else:
        opposite_type = imports.SheetType.SELL
        sort_order = imports.ImportItem.price.desc()

    best_comp_subq = (
        select(
            imports.ImportItem.ean,
            imports.ImportItem.price.label("comparison_price"),
            imports.ImportBatch.supplier_name.label("comparison_supplier"),
            imports.ImportBatch.id.label("comparison_batch_id"),
            imports.ImportBatch.currency.label("comparison_currency"),
        )
        .join(imports.ImportBatch)
        .where(imports.ImportBatch.sheet_type == opposite_type)
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

    if batch.sheet_type == imports.SheetType.SELL:
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

    return results, total


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
