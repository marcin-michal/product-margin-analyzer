import { Badge } from "../ui/Badge.tsx";
import type { SheetType, StockType } from "../../types/imports.ts";

export function SheetTypeBadge({ type }: { type: SheetType }) {
  return type === "sell" ? <Badge variant="green">Sell</Badge> : <Badge variant="blue">Buy</Badge>;
}

export function StockTypeBadge({ type }: { type: StockType }) {
  return type === "preorder" ? (
    <Badge variant="yellow">Preorder</Badge>
  ) : (
    <Badge variant="gray">Stock</Badge>
  );
}
