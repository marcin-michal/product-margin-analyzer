from sqlalchemy import Case, func, select
from sqlalchemy.orm import Session

from app.models import models
from app.schemas.imports import ImportItemDTO
from app.services.currency import get_exchange_rates


def get_paginated_batches(
    db: Session, skip: int, limit: int
) -> tuple[list[models.ImportBatch], int]:
    total = db.execute(select(func.count()).select_from(models.ImportBatch)).scalar()

    batches = (
        db.execute(
            select(models.ImportBatch)
            .order_by(models.ImportBatch.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    return list(batches), total or 0


def get_paginated_items_with_margins(
    db: Session, batch_id: int, skip: int, limit: int, sort_by_margin: bool
) -> tuple[list[dict], int]:
    batch = db.execute(
        select(models.ImportBatch).where(models.ImportBatch.id == batch_id)
    ).scalar_one_or_none()

    if not batch:
        return [], 0

    total = db.execute(
        select(func.count())
        .select_from(models.ImportItem)
        .where(models.ImportItem.batch_id == batch_id)
    ).scalar()

    if batch.sheet_type == models.SheetType.SELL:
        opposite_type = models.SheetType.BUY
        sort_order = models.ImportItem.price.asc()
    else:
        opposite_type = models.SheetType.SELL
        sort_order = models.ImportItem.price.desc()

    best_comp_subq = (
        select(
            models.ImportItem.ean,
            models.ImportItem.price.label("comparison_price"),
            models.ImportBatch.supplier_name.label("comparison_supplier"),
            models.ImportBatch.id.label("comparison_batch_id"),
            models.ImportBatch.currency.label("comparison_currency"),
        )
        .join(models.ImportBatch)
        .where(models.ImportBatch.sheet_type == opposite_type)
        .distinct(models.ImportItem.ean)
        .order_by(models.ImportItem.ean, sort_order)
        .subquery()
    )

    rates = get_exchange_rates()
    anchor_multiplier = rates.get(batch.currency.value, 1.0)
    anchor_price_base = models.ImportItem.price * anchor_multiplier

    comp_rate_case = Case(
        {
            best_comp_subq.c.comparison_currency == currency: rate
            for currency, rate in rates.items()
        },
        else_=1.0,
    )
    comp_price_base = best_comp_subq.c.comparison_price * comp_rate_case

    if batch.sheet_type == models.SheetType.SELL:
        margin_expr = (
            (anchor_price_base - comp_price_base) / func.nullif(anchor_price_base, 0)
        ) * 100
    else:
        margin_expr = (
            (comp_price_base - anchor_price_base) / func.nullif(comp_price_base, 0)
        ) * 100

    query = (
        select(
            models.ImportItem.id,
            models.ImportItem.ean,
            models.ImportItem.product_name,
            models.ImportItem.price,
            best_comp_subq.c.comparison_price,
            best_comp_subq.c.comparison_supplier,
            best_comp_subq.c.comparison_batch_id,
            best_comp_subq.c.comparison_currency,
            margin_expr.label("margin_percentage"),
        )
        .outerjoin(best_comp_subq, models.ImportItem.ean == best_comp_subq.c.ean)
        .where(models.ImportItem.batch_id == batch_id)
    )

    if sort_by_margin:
        query = query.order_by(margin_expr.desc().nulls_last())
    else:
        query = query.order_by(models.ImportItem.id.asc())

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


def create_import_batch(
    db: Session,
    filename: str,
    supplier_name: str,
    sheet_type: models.SheetType,
    stock_type: models.StockType,
    currency: models.Currency,
    description: str | None,
    parsed_items: list[ImportItemDTO],
) -> tuple[int, int]:
    new_batch = models.ImportBatch(
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
        models.ImportItem(
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
