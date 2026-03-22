from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import models
from app.schemas.core import PaginatedResponse
from app.schemas.imports import ImportBatchResponse, ImportItemResponse
from app.services.imports import (
    create_import_batch,
    get_paginated_batches,
    get_paginated_items_with_margins,
)
from app.services.parser import process_import_confirmation, process_preview

router = APIRouter(prefix="/api/imports", tags=["Imports"])


@router.get("", response_model=PaginatedResponse[ImportBatchResponse])
def get_imports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    batches, total = get_paginated_batches(db, skip, limit)

    return {"data": batches, "total": total, "skip": skip, "limit": limit}


@router.get("/{batch_id}/items", response_model=PaginatedResponse[ImportItemResponse])
def get_import_items(
    batch_id: int,
    skip: int = 0,
    limit: int = 100,
    sort_by_margin: bool = True,
    db: Session = Depends(get_db),
):
    items, total = get_paginated_items_with_margins(
        db, batch_id, skip, limit, sort_by_margin
    )

    if not items and total == 0:
        batch_exists = db.execute(
            select(models.ImportBatch.id).where(models.ImportBatch.id == batch_id)
        ).scalar_one_or_none()

        if not batch_exists:
            raise HTTPException(status_code=404, detail="Import batch not found")

    return {"data": items, "total": total, "skip": skip, "limit": limit}


@router.post("", status_code=201)
async def create_import(
    file: UploadFile = File(...),
    supplier_name: str = Form(...),
    sheet_type: models.SheetType = Form(...),
    stock_type: models.StockType = Form(...),
    currency: models.Currency = Form(...),
    description: str = Form(None),
    header_index: int = Form(...),
    ean_col: int = Form(...),
    product_col: int = Form(...),
    price_col: int = Form(...),
    db: Session = Depends(get_db),
):
    contents = await file.read()

    try:
        parsed_items = process_import_confirmation(
            contents, file.filename, header_index, ean_col, product_col, price_col
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to process file data: {str(e)}"
        )

    if not parsed_items:
        raise HTTPException(
            status_code=400,
            detail="No valid products found after filtering missing EANs.",
        )

    batch_id, rows_inserted = create_import_batch(
        db,
        file.filename,
        supplier_name,
        sheet_type,
        stock_type,
        currency,
        description,
        parsed_items,
    )

    return {
        "message": "Import successful",
        "batch_id": batch_id,
        "rows_inserted": rows_inserted,
    }


@router.post("/preview")
async def preview_spreadsheet(file: UploadFile = File(...)):
    contents = await file.read()

    try:
        return process_preview(contents, file.filename)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")
