import { useState } from "react";
import { Inbox } from "lucide-react";
import { BatchCard } from "../components/batch/BatchCard.tsx";
import { Button } from "../components/ui/Button.tsx";
import { useDeleteBatch, useListBatches } from "../hooks/useImports.ts";

const PAGE_SIZE = 12;

export function BatchListPage() {
  const [page, setPage] = useState(0);
  const skip = page * PAGE_SIZE;

  const { data, isLoading, isError, error } = useListBatches(skip, PAGE_SIZE);
  const deleteMutation = useDeleteBatch();

  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = () => {
    if (pendingDeleteId === null) return;

    deleteMutation.mutate(pendingDeleteId, {
      onSettled: () => setPendingDeleteId(null),
    });
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const renderContent = () => {
    if (isLoading) {
      return <p className="py-12 text-center text-sm text-gray-500">Loading...</p>;
    }

    if (isError) {
      return <p className="py-12 text-center text-sm text-red-600">{error.message}</p>;
    }

    if (!data || data.data.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
          <Inbox className="h-10 w-10" />
          <p className="text-sm">No imports yet. Upload a spreadsheet to get started.</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((batch) => (
            <BatchCard key={batch.id} batch={batch} onDelete={handleDelete} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-gray-900">Imports</h1>

      {renderContent()}

      {pendingDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">Delete Import</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete this import batch and all its items. This action cannot
              be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDelete}
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
