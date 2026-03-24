export type SheetType = "buy" | "sell";
export type StockType = "stock" | "preorder";
export type Currency = "EUR" | "USD" | "GBP" | "CZK";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ImportBatch {
  id: number;
  filename: string;
  supplier_name: string;
  sheet_type: SheetType;
  stock_type: StockType;
  currency: Currency;
  description: string | null;
  created_at: string;
}

export interface ImportItem {
  id: number;
  ean: string;
  product_name: string;
  price: number;
  comparison_price: number | null;
  comparison_supplier: string | null;
  comparison_batch_id: number | null;
  comparison_currency: string | null;
  margin_percentage: number | null;
}

export interface PreviewMetadata {
  suggested_header_index: number | null;
  suggested_mapping: Record<string, number | null> | null;
  header_columns: Record<string, string> | null;
}

export interface PreviewResponse {
  filename: string;
  metadata: PreviewMetadata;
  raw_grid: unknown[][];
}

export interface BatchCreateResponse {
  message: string;
  batch_id: number;
  rows_inserted: number;
}

export interface BatchUpdatePayload {
  supplier_name?: string;
  description?: string | null;
  sheet_type?: SheetType;
  stock_type?: StockType;
  currency?: Currency;
}

export interface MatchSourceItem {
  item_id: number;
  ean: string;
  product_name: string;
  price: number;
  currency: string;
  sheet_type: SheetType;
}

export interface MatchItem {
  item_id: number;
  product_name: string;
  price: number;
  batch_id: number;
  batch_filename: string;
  supplier_name: string;
  currency: string;
  margin_percentage: number | null;
}

export interface ItemMatchesResponse {
  source: MatchSourceItem;
  matches: MatchItem[];
}

export interface BatchCreatePayload {
  file: File;
  supplier_name: string;
  sheet_type: SheetType;
  stock_type: StockType;
  currency: Currency;
  description: string;
  header_index: number;
  ean_col: number;
  product_col: number;
  price_col: number;
}
