import { Link } from "react-router-dom";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import { Badge } from "../ui/Badge.tsx";
import { SheetTypeBadge, StockTypeBadge } from "./batchBadges.tsx";
import type { ImportBatch } from "../../types/imports.ts";

interface BatchCardProps {
  batch: ImportBatch;
  onDelete: (id: number) => void;
}

export function BatchCard({ batch, onDelete }: BatchCardProps) {
  const date = new Date(batch.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link
        to={`/batches/${batch.id}`}
        className="absolute inset-0 z-10 rounded-xl"
        aria-label={`View ${batch.filename}`}
      />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{batch.filename}</p>
            <p className="text-xs text-gray-500">{batch.supplier_name}</p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(batch.id);
          }}
          className="relative z-20 cursor-pointer rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
          aria-label="Delete batch"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SheetTypeBadge type={batch.sheet_type} />
        <StockTypeBadge type={batch.stock_type} />
        <Badge>{batch.currency}</Badge>
      </div>

      <p className="mt-3 text-xs text-gray-400">{date}</p>

      {batch.description && (
        <p className="mt-1 truncate text-xs text-gray-500">{batch.description}</p>
      )}
    </div>
  );
}
