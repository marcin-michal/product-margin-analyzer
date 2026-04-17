from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select

from app.db import DbSession
from app.models import imports
from app.schemas.core import PaginatedResponse
from app.schemas.imports import (
    ImportBatchCreateResponse,
    ImportBatchResponse,
    ImportBatchUpdate,
    ImportItemResponse,
    ItemMatchesResponse,
)
from app.services.imports import (
    create_batch,
    delete_batch,
    get_batch,
    get_batch_items,
    get_item_matches,
    list_batches,
    update_batch,
)
from app.services.parser import process_import_confirmation, process_preview

router = APIRouter(prefix="/api/imports", tags=["Imports"])


@router.get("", response_model=PaginatedResponse[ImportBatchResponse])
def list_all_batches(db: DbSession, skip: int = 0, limit: int = 100):
    batches, total = list_batches(db, skip, limit)

    return {"data": batches, "total": total, "skip": skip, "limit": limit}


@router.get("/{batch_id}", response_model=ImportBatchResponse)
def get_batch_detail(batch_id: int, db: DbSession):
    batch = get_batch(db, batch_id)

    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")

    return batch


@router.get("/{batch_id}/items", response_model=PaginatedResponse[ImportItemResponse])
def get_batch_item_list(
    batch_id: int,
    db: DbSession,
    skip: int = 0,
    limit: int = 100,
    sort_by_margin: bool = True,
    compare_with: str | None = None,
    focus_item_id: int | None = None,
):
    items, total, adjusted_skip = get_batch_items(
        db, batch_id, skip, limit, sort_by_margin, compare_with, focus_item_id
    )

    if not items and total == 0:
        batch_exists = db.execute(
            select(imports.ImportBatch.id).where(imports.ImportBatch.id == batch_id)
        ).scalar_one_or_none()

        if not batch_exists:
            raise HTTPException(status_code=404, detail="Import batch not found")

    return {"data": items, "total": total, "skip": adjusted_skip, "limit": limit}


@router.get("/{batch_id}/items/{item_id}/matches", response_model=ItemMatchesResponse)
def get_item_match_list(
    batch_id: int, item_id: int, db: DbSession, compare_with: str | None = None
):
    result = get_item_matches(db, batch_id, item_id, compare_with)

    if not result:
        raise HTTPException(status_code=404, detail="Item not found in this batch")

    source, matches = result
    return {"source": source, "matches": matches}


@router.post(
    "", status_code=status.HTTP_201_CREATED, response_model=ImportBatchCreateResponse
)
def create_new_batch(
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

    batch_id, rows_inserted = create_batch(
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


@router.patch("/{batch_id}", response_model=ImportBatchResponse)
def update_existing_batch(
    batch_id: int,
    update_data: ImportBatchUpdate,
    db: DbSession,
):
    batch = update_batch(db, batch_id, update_data)

    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")

    return batch


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_batch(batch_id: int, db: DbSession):
    success = delete_batch(db, batch_id)

    if not success:
        raise HTTPException(status_code=404, detail="Import batch not found")


@router.post("/preview")
def preview_file(file: UploadFile = File(...)):
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
