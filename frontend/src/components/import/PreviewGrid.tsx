interface PreviewGridProps {
  grid: unknown[][];
  selectedHeaderIndex: number | null;
  mappedColumns: { ean: number | null; product: number | null; price: number | null };
  onHeaderRowClick: (rowIndex: number) => void;
}

export function PreviewGrid({
  grid,
  selectedHeaderIndex,
  mappedColumns,
  onHeaderRowClick,
}: PreviewGridProps) {
  if (grid.length === 0) return null;

  const colCount = Math.max(...grid.map((row) => row.length));
  const mappedColIndices = new Set(
    [mappedColumns.ean, mappedColumns.product, mappedColumns.price].filter(
      (v): v is number => v !== null,
    ),
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left text-xs">
        <tbody>
          {grid.map((row, rowIdx) => {
            const isHeader = rowIdx === selectedHeaderIndex;

            return (
              <tr
                key={rowIdx}
                onClick={() => onHeaderRowClick(rowIdx)}
                className={`cursor-pointer border-b border-gray-100 transition-colors last:border-b-0 ${isHeader ? "bg-indigo-100 font-semibold text-indigo-900" : "hover:bg-gray-50"}`}
              >
                <td className="w-10 px-2 py-1.5 text-center text-gray-400 select-none">{rowIdx}</td>
                {Array.from({ length: colCount }, (_, colIdx) => {
                  const isMapped = mappedColIndices.has(colIdx);
                  const cellValue = colIdx < row.length ? row[colIdx] : null;

                  return (
                    <td
                      key={colIdx}
                      className={`max-w-[180px] truncate px-2 py-1.5 ${isMapped && !isHeader ? "bg-indigo-50/50" : ""} ${isHeader && isMapped ? "bg-indigo-200/60" : ""}`}
                    >
                      {cellValue != null ? String(cellValue) : ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
