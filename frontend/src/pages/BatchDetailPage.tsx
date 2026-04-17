import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "../components/ui/Button.tsx";
import { Input } from "../components/ui/Input.tsx";
import { Select } from "../components/ui/Select.tsx";
import { Textarea } from "../components/ui/Textarea.tsx";
import { BatchItemsTable } from "../components/batch/BatchItemsTable.tsx";
import { SheetTypeBadge, StockTypeBadge } from "../components/batch/batchBadges";
import { SHEET_TYPE_OPTIONS, STOCK_TYPE_OPTIONS, CURRENCY_OPTIONS } from "../constants/options.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { useBatch, useDeleteBatch, useUpdateBatch } from "../hooks/useImports.ts";
import type { BatchUpdatePayload, SheetType } from "../types/imports.ts";

export function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(batchId);
  const highlightItemId = searchParams.get("highlight")
    ? Number(searchParams.get("highlight"))
    : null;
  const initialCompareWith = (searchParams.get("compare_with") as SheetType) ?? undefined;

  const validId = Number.isFinite(id);
  const { data: batch, isLoading, isError } = useBatch(id, validId);
  const updateMutation = useUpdateBatch();
  const deleteMutation = useDeleteBatch();

  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<BatchUpdatePayload>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading...</p>;
  }

  if (!validId || isError || !batch) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-sm text-gray-500">
          {!validId ? "Invalid batch ID." : "Batch not found."}
        </p>
        <Link to="/">
          <Button variant="secondary" size="sm">
            Back to list
          </Button>
        </Link>
      </div>
    );
  }

  const startEditing = () => {
    setEditDraft({
      supplier_name: batch.supplier_name,
      description: batch.description,
      sheet_type: batch.sheet_type,
      stock_type: batch.stock_type,
      currency: batch.currency,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditDraft({});
  };

  const saveEditing = () => {
    updateMutation.mutate(
      { batchId: id, payload: editDraft },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(id, {
      onSuccess: () => navigate("/"),
    });
  };

  const date = new Date(batch.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">{batch.filename}</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        {!isEditing ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{batch.supplier_name}</p>
                <p className="mt-0.5 text-xs text-gray-500">{date}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={startEditing}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <SheetTypeBadge type={batch.sheet_type} />
              <StockTypeBadge type={batch.stock_type} />
              <Badge>{batch.currency}</Badge>
            </div>
            {batch.description && <p className="text-sm text-gray-600">{batch.description}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Input
              label="Supplier Name"
              id="edit-supplier-name"
              value={editDraft.supplier_name ?? ""}
              onChange={(e) => setEditDraft((d) => ({ ...d, supplier_name: e.target.value }))}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Sheet Type"
                id="edit-sheet-type"
                options={SHEET_TYPE_OPTIONS}
                value={editDraft.sheet_type ?? batch.sheet_type}
                onChange={(e) =>
                  setEditDraft((d) => ({
                    ...d,
                    sheet_type: e.target.value as "buy" | "sell",
                  }))
                }
              />
              <Select
                label="Stock Type"
                id="edit-stock-type"
                options={STOCK_TYPE_OPTIONS}
                value={editDraft.stock_type ?? batch.stock_type}
                onChange={(e) =>
                  setEditDraft((d) => ({
                    ...d,
                    stock_type: e.target.value as "stock" | "preorder",
                  }))
                }
              />
              <Select
                label="Currency"
                id="edit-currency"
                options={CURRENCY_OPTIONS}
                value={editDraft.currency ?? batch.currency}
                onChange={(e) =>
                  setEditDraft((d) => ({
                    ...d,
                    currency: e.target.value as "EUR" | "USD" | "GBP" | "CZK",
                  }))
                }
              />
            </div>
            <Textarea
              label="Description"
              id="edit-description"
              value={editDraft.description ?? ""}
              onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
              rows={2}
            />
            {updateMutation.isError && (
              <p className="text-sm text-red-600">{updateMutation.error.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={cancelEditing}>
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={saveEditing} disabled={updateMutation.isPending}>
                <Check className="h-3.5 w-3.5" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <BatchItemsTable
        batchId={id}
        sheetType={batch.sheet_type}
        highlightItemId={highlightItemId}
        initialCompareWith={initialCompareWith}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">Delete Import</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete this import batch and all its items.
            </p>
            {deleteMutation.isError && (
              <p className="mt-2 text-sm text-red-600">{deleteMutation.error.message}</p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
