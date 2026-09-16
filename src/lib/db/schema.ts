import { relations } from "drizzle-orm";
import { type SQLiteColumn, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Schema Drizzle — Controle de Vendas MEI (sale-track).
 *
 * Regras financeiras (ver constitution.md):
 * - Dinheiro SEMPRE em centavos inteiros (`*Cents`); nunca float.
 * - Faturamento (sales) e caixa (cash_entries) são ledgers SEPARADOS (D1/D8).
 * - NFe é imutável: venda estornada = status `refunded`, nunca exclusão (D7).
 * - Custo congelado na venda (sale_items.frozenCostCents) — D6.
 * - Dedup por nº da nota: UNIQUE (invoiceNumber, issueDate, serie) — D4.
 */

/* ============================== Category ============================== */

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("categories_name_idx").on(t.name)],
);

export const categoryRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

/* ============================== Product ============================== */

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    salePriceCents: integer("sale_price_cents").notNull().default(0),
    estimatedCostCents: integer("estimated_cost_cents").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("products_active_idx").on(t.active), index("products_category_idx").on(t.categoryId)],
);

export const productRelations = relations(products, ({ many, one }) => ({
  codes: many(productCodes),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
}));

/* ============================ ProductCode ============================ */
/**
 * Multi-código por canal (D3): cProd do XML X produto.
 * `channel` = "shopee" | "tiktok" | "geral" | null (vale p/ qualquer canal).
 * Sempre que o usuário vincula uma venda, o sistema aprende o código →
 * cria/atualiza esta tabela (auto-vinculação em imports futuros).
 */

export const productCodes = sqliteTable(
  "product_codes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    channel: text("channel"), // null = geral
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("product_codes_code_channel_idx").on(t.code, t.channel),
    index("product_codes_product_idx").on(t.productId),
  ],
);

export const productCodeRelations = relations(productCodes, ({ one }) => ({
  product: one(products, { fields: [productCodes.productId], references: [products.id] }),
}));

/* ============================== Sale ============================== */

export const sales = sqliteTable(
  "sales",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    channel: text("channel").notNull(), // shopee | tiktok | presencial
    saleDate: integer("sale_date", { mode: "timestamp" }).notNull(),
    status: text("status").notNull().default("normal"), // normal | refunded
    refundDate: integer("refund_date", { mode: "timestamp" }),
    grossCents: integer("gross_cents").notNull(), // valor bruto (NFe) — imutável
    feeCents: integer("fee_cents").notNull().default(0), // taxa marketplace, editável
    netCents: integer("net_cents").notNull(), // = gross - fee (financeiro)
    liquidCents: integer("liquid_cents").notNull().default(0), // = gross - fee - costo (margem)
    invoiceNumber: text("invoice_number"),
    invoiceSerie: text("invoice_serie"),
    issueDate: integer("issue_date", { mode: "timestamp" }), // dhEmi da NFe
    xmlFilename: text("xml_filename"),
    xmlStoredPath: text("xml_stored_path"),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  // Dedup por nº da nota (D4/FR-002): mesma NFe nunca importa 2x. NULLs (venda
  // presencial, sem nota) são distintos em SQLite → não geram conflito.
  (t) => [uniqueIndex("sales_invoice_dedup_idx").on(t.invoiceNumber, t.issueDate, t.invoiceSerie)],
);

export const saleRelations = relations(sales, ({ many, one }) => ({
  items: many(saleItems),
  cashEntries: many(cashEntries),
}));

/* ============================ SaleItem ============================ */

export const saleItems = sqliteTable(
  "sale_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    saleId: integer("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }), // null = sem vínculo
    cProd: text("c_prod").notNull(), // código do produto no XML (bruto)
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    frozenCostCents: integer("frozen_cost_cents"), // congelado na venda (D6); null = sem custo
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("sale_items_sale_idx").on(t.saleId), index("sale_items_product_idx").on(t.productId)],
);

export const saleItemRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

/* ===== CashEntry ===== */

export const cashEntries = sqliteTable(
  "cash_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: integer("date", { mode: "timestamp" }).notNull(),
    type: text("type").notNull(), // entrada | saida
    category: text("category").notNull(), // taxas | filamento | energia | manutencao | embalagem | venda | outros
    amountCents: integer("amount_cents").notNull(), // sempre > 0; sinal vem do type
    description: text("description").notNull().default(""),
    saleId: integer("sale_id").references(() => sales.id, { onDelete: "set null" }), // vínculo opcional
    // Estorno explícito (D7): nunca excluir — status + data; reversalOfId aponta
    // para a entrada que esta reversão cancela (a original fica `estornado`).
    status: text("status").notNull().default("normal"), // normal | estornado
    reversedAt: integer("reversed_at", { mode: "timestamp" }),
    reversalOfId: integer("reversal_of_id").references((): SQLiteColumn => cashEntries.id, { onDelete: "set null" }), // preenchido na ENTRADA de reversão
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("cash_entries_date_idx").on(t.date),
    index("cash_entries_category_idx").on(t.category),
    index("cash_entries_reversal_idx").on(t.reversalOfId),
  ],
);

export const cashEntryRelations = relations(cashEntries, ({ one }) => ({
  sale: one(sales, { fields: [cashEntries.saleId], references: [sales.id] }),
}));

/* ============================ Settings ============================ */

export const settings = sqliteTable(
  "settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(), // valor serializado (texto/percentual/centavos)
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("settings_key_idx").on(t.key)],
);
