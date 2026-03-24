import { useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { Badge } from "../ui/Badge.tsx";
import { useItemMatches } from "../../hooks/useImports.ts";

interface MarginDetailModalProps {
  batchId: number;
  itemId: number;
  onClose: () => void;
}

function formatPrice(value: number, currency: string): string {
  return `${value.toFixed(2)} ${currency}`;
}

function MarginBadge({ value }: { value: number | null }) {
  if (value === null) return <Badge variant="gray">N/A</Badge>;

  if (value > 10) return <Badge variant="green">+{value.toFixed(2)}%</Badge>;
  if (value > 0) return <Badge variant="yellow">+{value.toFixed(2)}%</Badge>;
  if (value === 0) return <Badge variant="gray">0.00%</Badge>;
  return <Badge variant="red">{value.toFixed(2)}%</Badge>;
}

export function MarginDetailModal({ batchId, itemId, onClose }: MarginDetailModalProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useItemMatches(batchId, itemId);

  const goToMatch = (matchBatchId: number, matchItemId: number) => {
    onClose();
    navigate(`/batches/${matchBatchId}?highlight=${matchItemId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Margin Breakdown</h2>
            {data && (
              <p className="mt-0.5 font-mono text-xs text-gray-500">EAN {data.source.ean}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && (
            <p className="py-8 text-center text-sm text-gray-500">Loading matches...</p>
          )}

          {isError && (
            <p className="py-8 text-center text-sm text-red-600">Failed to load match data.</p>
          )}

          {data && (
            <div className="flex flex-col gap-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
                  Source Item
                </p>
                <p className="text-sm font-medium text-gray-900">{data.source.product_name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-gray-500">{data.source.ean}</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(data.source.price, data.source.currency)}
                  </span>
                  <Badge variant={data.source.sheet_type === "sell" ? "green" : "blue"}>
                    {data.source.sheet_type === "sell" ? "Sell" : "Buy"}
                  </Badge>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                    {data.matches.length === 0
                      ? "No matches found"
                      : `${data.matches.length} match${data.matches.length !== 1 ? "es" : ""} from ${data.source.sheet_type === "sell" ? "buy" : "sell"} batches`}
                  </p>
                </div>

                {data.matches.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {data.matches.map((match, idx) => (
                      <div
                        key={match.item_id}
                        onClick={() => goToMatch(match.batch_id, match.item_id)}
                        className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                          idx === 0
                            ? "border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {match.supplier_name}
                              </p>
                              {idx === 0 && (
                                <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 uppercase">
                                  Best
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {match.batch_filename}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatPrice(match.price, match.currency)}
                            </span>
                            <MarginBadge value={match.margin_percentage} />
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-gray-500">
                          {match.product_name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {data && data.matches.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-3">
            <p className="text-center text-xs text-gray-400">
              Click a match to view it in its batch
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
