from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ImportItemDTO(BaseModel):
    ean: str
    product_name: str
    price: float


class PreviewMetadata(BaseModel):
    suggested_header_index: int
    suggested_mapping: dict[str, int | None]
    header_columns: dict[str, str]


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
