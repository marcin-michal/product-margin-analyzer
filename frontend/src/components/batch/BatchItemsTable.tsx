import { useCallback, useEffect, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useBatchItems } from "../../hooks/useImports.ts";
import type { ImportItem } from "../../types/imports.ts";
import { Button } from "../ui/Button.tsx";
import { MarginDetailModal } from "./MarginDetailModal.tsx";

const PAGE_SIZE = 50;
const columnHelper = createColumnHelper<ImportItem>();

function formatPrice(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(2);
}

function MarginCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">—</span>;

  let colorClass = "text-gray-600";
  if (value > 0) colorClass = "text-green-700 bg-green-50";
  else if (value < 0) colorClass = "text-red-700 bg-red-50";

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

const columns = [
  columnHelper.accessor("ean", {
    header: "EAN",
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor("product_name", {
    header: "Product",
    cell: (info) => <span className="block max-w-[200px] truncate">{info.getValue()}</span>,
  }),
  columnHelper.accessor("price", {
    header: "Price",
    cell: (info) => formatPrice(info.getValue()),
  }),
  columnHelper.accessor("comparison_price", {
    header: "Match Price",
    cell: (info) => formatPrice(info.getValue()),
  }),
  columnHelper.accessor("comparison_supplier", {
    header: "Match Supplier",
    cell: (info) => info.getValue() ?? <span className="text-gray-400">—</span>,
  }),
  columnHelper.accessor("comparison_currency", {
    header: "Match Currency",
    cell: (info) => info.getValue() ?? <span className="text-gray-400">—</span>,
  }),
  columnHelper.accessor("margin_percentage", {
    header: "Margin",
    cell: (info) => <MarginCell value={info.getValue()} />,
  }),
];

interface BatchItemsTableProps {
  batchId: number;
  highlightItemId?: number | null;
}

export function BatchItemsTable({ batchId, highlightItemId }: BatchItemsTableProps) {
  const [page, setPage] = useState(0);
  const [sortByMargin, setSortByMargin] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);
  const hasScrolled = useRef(false);
  const skip = page * PAGE_SIZE;

  const { data, isLoading, isError, error } = useBatchItems(batchId, skip, PAGE_SIZE, sortByMargin);

  const tableData = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    hasScrolled.current = false;
  }, [highlightItemId]);

  useEffect(() => {
    if (highlightItemId && highlightedRowRef.current && !hasScrolled.current) {
      hasScrolled.current = true;
      highlightedRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightItemId, data]);

  const setHighlightRef = useCallback(
    (itemId: number) => (el: HTMLTableRowElement | null) => {
      if (itemId === highlightItemId) {
        highlightedRowRef.current = el;
      }
    },
    [highlightItemId],
  );

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-gray-500">Loading items...</p>;
  }

  if (isError) {
    return <p className="py-8 text-center text-sm text-red-600">{error.message}</p>;
  }

  if (tableData.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">No items in this batch.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {total} item{total !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => {
            setSortByMargin((v) => !v);
            setPage(0);
          }}
          className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          Sort by: {sortByMargin ? "Margin" : "Default"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.map((row) => {
              const isHighlighted = row.original.id === highlightItemId;

              return (
                <tr
                  key={row.id}
                  ref={setHighlightRef(row.original.id)}
                  onClick={() => setSelectedItemId(row.original.id)}
                  className={`cursor-pointer transition-colors ${
                    isHighlighted
                      ? "bg-amber-100 ring-1 ring-amber-300 ring-inset"
                      : "hover:bg-indigo-50/50"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 text-sm whitespace-nowrap text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
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

      {selectedItemId !== null && (
        <MarginDetailModal
          batchId={batchId}
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </div>
  );
}
