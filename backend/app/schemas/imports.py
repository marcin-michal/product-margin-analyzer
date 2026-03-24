from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.imports import Currency, SheetType, StockType


class ImportItemParsed(BaseModel):
    ean: str
    product_name: str
    price: float


class PreviewMetadata(BaseModel):
    suggested_header_index: int | None
    suggested_mapping: dict[str, int | None] | None
    header_columns: dict[str, str] | None


class PreviewResponse(BaseModel):
    filename: str
    metadata: PreviewMetadata
    raw_grid: list[list[Any]]


class ImportBatchResponse(BaseModel):
    id: int
    filename: str
    supplier_name: str
    sheet_type: str
    stock_type: str
    currency: str
    description: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImportItemResponse(BaseModel):
    id: int
    ean: str
    product_name: str
    price: float

    comparison_price: float | None = None
    comparison_supplier: str | None = None
    comparison_batch_id: int | None = None
    comparison_currency: str | None = None
    margin_percentage: float | None = None

    model_config = ConfigDict(from_attributes=True)


class ImportBatchCreateResponse(BaseModel):
    message: str
    batch_id: int
    rows_inserted: int


class ImportBatchUpdate(BaseModel):
    supplier_name: str | None = None
    description: str | None = None
    sheet_type: SheetType | None = None
    stock_type: StockType | None = None
    currency: Currency | None = None


class MatchSourceItem(BaseModel):
    item_id: int
    ean: str
    product_name: str
    price: float
    currency: str
    sheet_type: str


class MatchItem(BaseModel):
    item_id: int
    product_name: str
    price: float
    batch_id: int
    batch_filename: str
    supplier_name: str
    currency: str
    margin_percentage: float | None = None


class ItemMatchesResponse(BaseModel):
    source: MatchSourceItem
    matches: list[MatchItem]
