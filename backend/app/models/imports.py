import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db import Base


class StockType(str, enum.Enum):
    STOCK = "stock"
    PREORDER = "preorder"


class SheetType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class Currency(str, enum.Enum):
    EUR = "EUR"
    USD = "USD"
    GBP = "GBP"
    CZK = "CZK"


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    supplier_name: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sheet_type: Mapped[SheetType] = mapped_column(SQLEnum(SheetType))
    stock_type: Mapped[StockType] = mapped_column(SQLEnum(StockType))
    currency: Mapped[Currency] = mapped_column(SQLEnum(Currency))

    items: Mapped[list["ImportItem"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )


class ImportItem(Base):
    __tablename__ = "import_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ean: Mapped[str] = mapped_column(String, index=True)
    product_name: Mapped[str] = mapped_column(String)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    batch_id: Mapped[int] = mapped_column(ForeignKey("import_batches.id"))
    batch: Mapped["ImportBatch"] = relationship(back_populates="items")
