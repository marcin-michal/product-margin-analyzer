import { del, get, patch, post } from "./client.ts";
import type {
  BatchCreatePayload,
  BatchCreateResponse,
  BatchUpdatePayload,
  ImportBatch,
  ImportItem,
  ItemMatchesResponse,
  PaginatedResponse,
  PreviewResponse,
} from "../types/imports.ts";

export function listBatches(skip: number, limit: number) {
  return get<PaginatedResponse<ImportBatch>>("/imports", { skip, limit });
}

export function getBatch(batchId: number) {
  return get<ImportBatch>(`/imports/${batchId}`);
}

export function getBatchItems(
  batchId: number,
  skip: number,
  limit: number,
  sortByMargin: boolean,
  compareWith?: string,
  focusItemId?: number,
) {
  const params: Record<string, string | number | boolean> = {
    skip,
    limit,
    sort_by_margin: sortByMargin,
  };
  if (compareWith) params.compare_with = compareWith;
  if (focusItemId !== undefined) params.focus_item_id = focusItemId;
  return get<PaginatedResponse<ImportItem>>(`/imports/${batchId}/items`, params);
}

export function getItemMatches(batchId: number, itemId: number, compareWith?: string) {
  const params: Record<string, string | number | boolean> = {};
  if (compareWith) {
    params.compare_with = compareWith;
  }

  return get<ItemMatchesResponse>(`/imports/${batchId}/items/${itemId}/matches`, params);
}

export function previewFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return post<PreviewResponse>("/imports/preview", formData);
}

export function createBatch(payload: BatchCreatePayload) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("supplier_name", payload.supplier_name);
  formData.append("sheet_type", payload.sheet_type);
  formData.append("stock_type", payload.stock_type);
  formData.append("currency", payload.currency);
  formData.append("description", payload.description);
  formData.append("header_index", String(payload.header_index));
  formData.append("ean_col", String(payload.ean_col));
  formData.append("product_col", String(payload.product_col));
  formData.append("price_col", String(payload.price_col));
  return post<BatchCreateResponse>("/imports", formData);
}

export function updateBatch(batchId: number, payload: BatchUpdatePayload) {
  return patch<ImportBatch>(`/imports/${batchId}`, payload);
}

export function deleteBatch(batchId: number) {
  return del(`/imports/${batchId}`);
}
