import type { ChangeEvent } from "react";
import { Select } from "../ui/Select.tsx";

interface ColumnMappingBarProps {
  headerValues: Record<string, string> | null;
  eanCol: number | null;
  productCol: number | null;
  priceCol: number | null;
  onEanColChange: (col: number | null) => void;
  onProductColChange: (col: number | null) => void;
  onPriceColChange: (col: number | null) => void;
}

function buildOptions(headerValues: Record<string, string> | null) {
  if (!headerValues) return [{ value: "", label: "Select header row first" }];

  const options = [{ value: "", label: "-- Select column --" }];

  for (const [idx, name] of Object.entries(headerValues)) {
    options.push({ value: idx, label: `${idx}: ${name || "(empty)"}` });
  }

  return options;
}

export function ColumnMappingBar({
  headerValues,
  eanCol,
  productCol,
  priceCol,
  onEanColChange,
  onProductColChange,
  onPriceColChange,
}: ColumnMappingBarProps) {
  const options = buildOptions(headerValues);

  const handleChange =
    (setter: (v: number | null) => void) =>
    (e: ChangeEvent<HTMLSelectElement>): void => {
      setter(e.target.value === "" ? null : Number(e.target.value));
    };

  return (
    <div className="flex flex-wrap gap-4">
      <Select
        label="EAN / Barcode"
        id="ean-col"
        options={options}
        value={eanCol ?? ""}
        onChange={handleChange(onEanColChange)}
        disabled={!headerValues}
      />
      <Select
        label="Product Name"
        id="product-col"
        options={options}
        value={productCol ?? ""}
        onChange={handleChange(onProductColChange)}
        disabled={!headerValues}
      />
      <Select
        label="Price"
        id="price-col"
        options={options}
        value={priceCol ?? ""}
        onChange={handleChange(onPriceColChange)}
        disabled={!headerValues}
      />
    </div>
  );
}
