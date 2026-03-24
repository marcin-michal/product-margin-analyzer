import { useCallback, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

const ACCEPTED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

function isAcceptedFile(file: File): boolean {
  return ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

export function FileUploadZone({ onFileSelected, isLoading }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (!isAcceptedFile(file)) {
        setError("Unsupported file format. Use .csv, .xlsx, or .xls");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex w-full max-w-xl cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${isDragOver ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-white hover:border-gray-400"} ${isLoading ? "pointer-events-none opacity-60" : ""}`}
      >
        <Upload className={`h-10 w-10 ${isDragOver ? "text-indigo-500" : "text-gray-400"}`} />
        <div>
          <p className="text-sm font-medium text-gray-700">
            Drop a spreadsheet here, or <span className="text-indigo-600">browse</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">CSV, XLS, or XLSX</p>
        </div>
        <input
          type="file"
          className="hidden"
          accept=".csv,.xls,.xlsx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          disabled={isLoading}
        />
      </label>

      {isLoading && <p className="text-sm text-gray-500">Parsing file...</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
