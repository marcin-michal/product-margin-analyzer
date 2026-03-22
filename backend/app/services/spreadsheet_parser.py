import io
from typing import Dict

import pandas as pd

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


def get_column_mapping_suggestion(header_values: list) -> Dict[str, str]:
    mapping: Dict[str, str] = {}

    for mapped_col, keywords in MAPPING_KEYWORDS.items():
        found_col_key = None

        for i, val in enumerate(header_values):
            if any(k in str(val).lower() for k in keywords):
                found_col_key = f"col_{i}"
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


def process_preview(contents: bytes, filename: str) -> dict:
    if filename.endswith(".csv"):
        df_raw = pd.read_csv(io.BytesIO(contents), nrows=20, header=None)
    elif filename.endswith((".xls", ".xlsx")):
        df_raw = pd.read_excel(io.BytesIO(contents), nrows=20, header=None)
    else:
        raise ValueError("Unsupported file format. Use .csv, .xlsx, or .xls")

    df_clean = df_raw.dropna(how="all").dropna(axis=1, how="all")
    df_clean = df_clean.reset_index(drop=True)
    df_clean.columns = range(df_clean.shape[1])

    header_row_index = 0
    header_keywords_count = 0

    for index, row in df_clean.iterrows():
        row_string = str(row.values)
        keywords_count = get_keywords_count(row_string)

        if keywords_count > header_keywords_count:
            header_keywords_count = keywords_count
            header_row_index = index

    header_values = df_clean.iloc[header_row_index].fillna("").astype(str).tolist()
    suggested_mapping = get_column_mapping_suggestion(header_values)

    df_clean = df_clean.astype(object).where(pd.notna(df_clean), None)
    raw_grid = df_clean.values.tolist()

    return {
        "filename": filename,
        "metadata": {
            "suggested_header_index": header_row_index,
            "suggested_mapping": suggested_mapping,
            "header_columns": {str(i): val for i, val in enumerate(header_values)},
        },
        "raw_grid": raw_grid,
    }
