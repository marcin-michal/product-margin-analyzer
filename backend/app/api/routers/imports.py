from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import select

from app.db.database import DbSession
from app.models import imports
from app.schemas.core import PaginatedResponse
from app.schemas.imports import (
    ImportBatchResponse,
    ImportCreateResponse,
    ImportItemResponse,
)
from app.services.imports import (
    create_import_batch,
    get_paginated_batches,
    get_paginated_items_with_margins,
)
from app.services.parser import process_import_confirmation, process_preview

router = APIRouter(prefix="/api/imports", tags=["Imports"])


@router.get("", response_model=PaginatedResponse[ImportBatchResponse])
def get_imports(db: DbSession, skip: int = 0, limit: int = 100):
    batches, total = get_paginated_batches(db, skip, limit)

    return {"data": batches, "total": total, "skip": skip, "limit": limit}


@router.get("/{batch_id}/items", response_model=PaginatedResponse[ImportItemResponse])
def get_import_items(
    batch_id: int,
    db: DbSession,
    skip: int = 0,
    limit: int = 100,
    sort_by_margin: bool = True,
):
    items, total = get_paginated_items_with_margins(
        db, batch_id, skip, limit, sort_by_margin
    )

    if not items and total == 0:
        batch_exists = db.execute(
            select(imports.ImportBatch.id).where(imports.ImportBatch.id == batch_id)
        ).scalar_one_or_none()

        if not batch_exists:
            raise HTTPException(status_code=404, detail="Import batch not found")

    return {"data": items, "total": total, "skip": skip, "limit": limit}


@router.post("", status_code=201, response_model=ImportCreateResponse)
def create_import(
    db: DbSession,
    file: UploadFile = File(...),
    supplier_name: str = Form(...),
    sheet_type: imports.SheetType = Form(...),
    stock_type: imports.StockType = Form(...),
    currency: imports.Currency = Form(...),
    description: str = Form(None),
    header_index: int = Form(...),
    ean_col: int = Form(...),
    product_col: int = Form(...),
    price_col: int = Form(...),
):
    if not file.filename:
        raise HTTPException(
            status_code=400, detail="File must have a filename with a valid extension."
        )

    contents = file.file.read()

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
def preview_spreadsheet(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(
            status_code=400, detail="File must have a filename with a valid extension."
        )

    contents = file.file.read()

    try:
        return process_preview(contents, file.filename)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing file: {str(e)}")
