import type { Currency, SheetType, StockType } from "../../types/imports.ts";
import {
  SHEET_TYPE_OPTIONS,
  STOCK_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
} from "../../constants/options.ts";
import { Input } from "../ui/Input.tsx";
import { Select } from "../ui/Select.tsx";
import { Textarea } from "../ui/Textarea.tsx";

export interface MetadataFormState {
  supplier_name: string;
  sheet_type: SheetType;
  stock_type: StockType;
  currency: Currency;
  description: string;
}

interface MetadataFormProps {
  value: MetadataFormState;
  onChange: (value: MetadataFormState) => void;
}

export function MetadataForm({ value, onChange }: MetadataFormProps) {
  function update<K extends keyof MetadataFormState>(field: K, fieldValue: MetadataFormState[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Supplier Name"
        id="supplier-name"
        placeholder="e.g. Acme Corp"
        required
        value={value.supplier_name}
        onChange={(e) => update("supplier_name", e.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Select
          label="Sheet Type"
          id="sheet-type"
          options={SHEET_TYPE_OPTIONS}
          value={value.sheet_type}
          onChange={(e) => update("sheet_type", e.target.value as SheetType)}
        />
        <Select
          label="Stock Type"
          id="stock-type"
          options={STOCK_TYPE_OPTIONS}
          value={value.stock_type}
          onChange={(e) => update("stock_type", e.target.value as StockType)}
        />
        <Select
          label="Currency"
          id="currency"
          options={CURRENCY_OPTIONS}
          value={value.currency}
          onChange={(e) => update("currency", e.target.value as Currency)}
        />
      </div>

      <Textarea
        label="Description (optional)"
        id="description"
        rows={2}
        placeholder="Notes about this import..."
        value={value.description}
        onChange={(e) => update("description", e.target.value)}
      />
    </div>
  );
}
