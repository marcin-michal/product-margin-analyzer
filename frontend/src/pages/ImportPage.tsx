import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FileUploadZone } from "../components/import/FileUploadZone.tsx";
import { PreviewGrid } from "../components/import/PreviewGrid.tsx";
import { ColumnMappingBar } from "../components/import/ColumnMappingBar.tsx";
import { MetadataForm, type MetadataFormState } from "../components/import/MetadataForm.tsx";
import { Button } from "../components/ui/Button.tsx";
import { useCreateBatch, usePreviewFile } from "../hooks/useImports.ts";
import type { PreviewResponse } from "../types/imports.ts";

const INITIAL_METADATA: MetadataFormState = {
  supplier_name: "",
  sheet_type: "buy",
  stock_type: "stock",
  currency: "EUR",
  description: "",
};

export function ImportPage() {
  const navigate = useNavigate();
  const previewMutation = usePreviewFile();
  const createMutation = useCreateBatch();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [headerIndex, setHeaderIndex] = useState<number | null>(null);
  const [eanCol, setEanCol] = useState<number | null>(null);
  const [productCol, setProductCol] = useState<number | null>(null);
  const [priceCol, setPriceCol] = useState<number | null>(null);
  const [metadata, setMetadata] = useState<MetadataFormState>(INITIAL_METADATA);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    previewMutation.mutate(selectedFile, {
      onSuccess: (data) => {
        setPreview(data);

        const suggested = data.metadata;
        setHeaderIndex(suggested.suggested_header_index);
        setEanCol(suggested.suggested_mapping?.ean ?? null);
        setProductCol(suggested.suggested_mapping?.product ?? null);
        setPriceCol(suggested.suggested_mapping?.price ?? null);
      },
    });
  };

  const handleHeaderRowClick = (rowIndex: number) => {
    setHeaderIndex(rowIndex);

    if (!preview) return;
    const row = preview.raw_grid[rowIndex];
    const newHeaderValues: Record<string, string> = {};
    row.forEach((val, i) => {
      newHeaderValues[String(i)] = val != null ? String(val) : "";
    });

    setPreview({
      ...preview,
      metadata: {
        ...preview.metadata,
        header_columns: newHeaderValues,
        suggested_header_index: rowIndex,
      },
    });

    setEanCol(null);
    setProductCol(null);
    setPriceCol(null);
  };

  const handleBack = () => {
    setFile(null);
    setPreview(null);
    setHeaderIndex(null);
    setEanCol(null);
    setProductCol(null);
    setPriceCol(null);
    setMetadata(INITIAL_METADATA);
    setValidationError(null);
    previewMutation.reset();
    createMutation.reset();
  };

  const handleSubmit = () => {
    setValidationError(null);

    if (!metadata.supplier_name.trim()) {
      setValidationError("Supplier name is required.");
      return;
    }
    if (headerIndex === null || eanCol === null || productCol === null || priceCol === null) {
      setValidationError("Please select a header row and map all three columns.");
      return;
    }
    if (!file) return;

    createMutation.mutate(
      {
        file,
        supplier_name: metadata.supplier_name.trim(),
        sheet_type: metadata.sheet_type,
        stock_type: metadata.stock_type,
        currency: metadata.currency,
        description: metadata.description,
        header_index: headerIndex,
        ean_col: eanCol,
        product_col: productCol,
        price_col: priceCol,
      },
      {
        onSuccess: (data) => {
          navigate(`/batches/${data.batch_id}`);
        },
      },
    );
  };

  if (!preview) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-lg font-semibold text-gray-900">New Import</h1>
        <FileUploadZone onFileSelected={handleFileSelected} isLoading={previewMutation.isPending} />
        {previewMutation.isError && (
          <p className="text-center text-sm text-red-600">{previewMutation.error.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Configure Import</h1>
        <span className="text-sm text-gray-500">{file?.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="mb-1 text-sm font-medium text-gray-700">Column Mapping</h2>
            <p className="mb-3 text-xs text-gray-500">
              Click a row to set it as the header, then map the columns.
            </p>
            <ColumnMappingBar
              headerValues={preview.metadata.header_columns}
              eanCol={eanCol}
              productCol={productCol}
              priceCol={priceCol}
              onEanColChange={setEanCol}
              onProductColChange={setProductCol}
              onPriceColChange={setPriceCol}
            />
          </div>

          <PreviewGrid
            grid={preview.raw_grid}
            selectedHeaderIndex={headerIndex}
            mappedColumns={{ ean: eanCol, product: productCol, price: priceCol }}
            onHeaderRowClick={handleHeaderRowClick}
          />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-gray-700">Batch Details</h2>
          <MetadataForm value={metadata} onChange={setMetadata} />

          {validationError && <p className="text-sm text-red-600">{validationError}</p>}
          {createMutation.isError && (
            <p className="text-sm text-red-600">{createMutation.error.message}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="mt-2 w-full"
          >
            {createMutation.isPending ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
}
