import io
import re

import pandas as pd

from app.schemas.imports import ImportItemDTO, PreviewMetadata, PreviewResponse

TARGET_KEYWORDS = [
    "ean",
    "barcode",
    "gtin",
    "price",
    "cost",
    "product",
    "code",
    "stock",
    "name",
]
MAPPING_KEYWORDS = {
    "ean": ["ean", "barcode", "gtin", "code", "id"],
    "product": ["product", "name"],
    "price": ["price", "cost"],
}


def get_keywords_count(row: str) -> int:
    count = 0

    for keyword in TARGET_KEYWORDS:
        count += row.lower().count(keyword.lower())

    return count


def get_column_mapping_suggestion(header_values: list) -> dict[str, str]:
    mapping: dict[str, str] = {}

    for mapped_col, keywords in MAPPING_KEYWORDS.items():
        found_col_key = None

        for i, val in enumerate(header_values):
            if any(k in str(val).lower() for k in keywords):
                found_col_key = i
                break

        mapping[mapped_col] = found_col_key

    return mapping


def get_header_row_suggestion(df: pd.DataFrame) -> int:
    header_row_index = -1
    header_keywords_count = 0

    for index, row in df.iterrows():
        row_string = str(row.values)
        keywords_count = get_keywords_count(row_string)

        if keywords_count > header_keywords_count:
            header_keywords_count = keywords_count
            header_row_index = index

    return header_row_index


def clean_price(raw_val) -> float:
    cleaned = re.sub(r"[^\d.,-]", "", str(raw_val))
    if not cleaned:
        return 0.0

    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "")  # Remove thousands dot
            cleaned = cleaned.replace(",", ".")  # Convert decimal comma to dot
        else:
            cleaned = cleaned.replace(",", "")  # Remove thousands comma
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")

    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def read_and_clean_sheet(
    contents: bytes, filename: str, limit: int | None = None
) -> pd.DataFrame:
    if filename.endswith(".csv"):
        df_raw = pd.read_csv(io.BytesIO(contents), nrows=limit, header=None)
    elif filename.endswith((".xls", ".xlsx")):
        df_raw = pd.read_excel(io.BytesIO(contents), nrows=limit, header=None)
    else:
        raise ValueError("Unsupported file format. Use .csv, .xlsx, or .xls")

    df_clean = df_raw.dropna(how="all").dropna(axis=1, how="all")
    df_clean = df_clean.reset_index(drop=True)
    df_clean.columns = range(df_clean.shape[1])

    return df_clean


def process_preview(contents: bytes, filename: str) -> dict:
    df = read_and_clean_sheet(contents, filename, limit=20)

    header_row_index = get_header_row_suggestion(df)
    header_values = df.iloc[header_row_index].fillna("").astype(str).tolist()
    suggested_mapping = get_column_mapping_suggestion(header_values)

    df = df.astype(object).where(pd.notna(df), None)

    return PreviewResponse(
        filename=filename,
        metadata=PreviewMetadata(
            suggested_header_index=header_row_index,
            suggested_mapping=suggested_mapping,
            header_columns={str(i): val for i, val in enumerate(header_values)},
        ),
        raw_grid=df.values.tolist(),
    )


def process_import_confirmation(
    contents: bytes,
    filename: str,
    header_index: int,
    ean_col: int,
    product_col: int,
    price_col: int,
) -> list[ImportItemDTO]:
    df = read_and_clean_sheet(contents, filename)

    df_data = df.iloc[header_index + 1 :].copy()
    df_data = df_data.dropna(subset=[ean_col])

    items = []
    for _, row in df_data.iterrows():
        items.append(
            ImportItemDTO(
                ean=str(row[ean_col]).strip(),
                product_name=str(row[product_col]).strip(),
                price=clean_price(row[price_col]),
            )
        )

    return items
