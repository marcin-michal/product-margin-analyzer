import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/imports.ts";
import type { BatchCreatePayload, BatchUpdatePayload } from "../types/imports.ts";

const BATCHES_KEY = "batches";
const BATCH_KEY = "batch";
const BATCH_ITEMS_KEY = "batch-items";
const ITEM_MATCHES_KEY = "item-matches";

export function useListBatches(skip: number, limit: number) {
  return useQuery({
    queryKey: [BATCHES_KEY, skip, limit],
    queryFn: () => api.listBatches(skip, limit),
  });
}

export function useBatch(batchId: number, enabled = true) {
  return useQuery({
    queryKey: [BATCH_KEY, batchId],
    queryFn: () => api.getBatch(batchId),
    enabled,
  });
}

export function useBatchItems(batchId: number, skip: number, limit: number, sortByMargin: boolean) {
  return useQuery({
    queryKey: [BATCH_ITEMS_KEY, batchId, skip, limit, sortByMargin],
    queryFn: () => api.getBatchItems(batchId, skip, limit, sortByMargin),
  });
}

export function useItemMatches(batchId: number, itemId: number | null) {
  return useQuery({
    queryKey: [ITEM_MATCHES_KEY, batchId, itemId],
    queryFn: () => api.getItemMatches(batchId, itemId!),
    enabled: itemId !== null,
  });
}

export function usePreviewFile() {
  return useMutation({
    mutationFn: (file: File) => api.previewFile(file),
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BatchCreatePayload) => api.createBatch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BATCHES_KEY] });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, payload }: { batchId: number; payload: BatchUpdatePayload }) =>
      api.updateBatch(batchId, payload),
    onSuccess: (_data, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: [BATCHES_KEY] });
      queryClient.invalidateQueries({ queryKey: [BATCH_KEY, batchId] });
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batchId: number) => api.deleteBatch(batchId),
    onSuccess: (_data, batchId) => {
      queryClient.invalidateQueries({ queryKey: [BATCHES_KEY] });
      queryClient.removeQueries({ queryKey: [BATCH_KEY, batchId] });
      queryClient.removeQueries({ queryKey: [BATCH_ITEMS_KEY, batchId] });
      queryClient.removeQueries({ queryKey: [ITEM_MATCHES_KEY, batchId] });
    },
  });
}
