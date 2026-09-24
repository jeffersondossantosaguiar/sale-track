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
    productType: text("product_type"),
    theme: text("theme"),
    primaryColor: text("primary_color"),
    sizeLabel: text("size_label"),
    finish: text("finish"),
    internalNotes: text("internal_notes"),
    imageKey: text("image_key"),
    imageMime: text("image_mime"),
    imageOriginalName: text("image_original_name"),
    imageBytes: integer("image_bytes"),
    marginBps: integer("margin_bps").notNull().default(3500), // margem unificada (005) — % do preço bruto
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
  variants: many(variants),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
}));

/* ============================== Variant ============================== */

export const variants = sqliteTable(
  "variants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    colorOverride: text("color_override"),
    sizeOverride: text("size_override"),
    finishOverride: text("finish_override"),
    notesOverride: text("notes_override"),
    imageKey: text("image_key"),
    imageMime: text("image_mime"),
    imageOriginalName: text("image_original_name"),
    imageBytes: integer("image_bytes"),
    printTimeMin: integer("print_time_min").notNull().default(0),
    manualTimeMin: integer("manual_time_min").notNull().default(0),
    filamentMaterialId: integer("filament_material_id").references(() => materials.id, { onDelete: "set null" }),
    filamentGrams: integer("filament_grams").notNull().default(0),
    packagingCents: integer("packaging_cents").notNull().default(0),
    accessoriesCents: integer("accessories_cents").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("variants_sku_idx").on(t.sku),
    index("variants_product_idx").on(t.productId),
    index("variants_material_idx").on(t.filamentMaterialId),
  ],
);

export const variantRelations = relations(variants, ({ many, one }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
  material: one(materials, { fields: [variants.filamentMaterialId], references: [materials.id] }),
  codes: many(productCodes),
  prices: many(variantPrices),
}));

/* ============================== Material ============================== */

export const materials = sqliteTable(
  "materials",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    pricePerKgCents: integer("price_per_kg_cents").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("materials_active_idx").on(t.active)],
);

/* ============================== VariantPrice ============================== */

export const variantPrices = sqliteTable(
  "variant_prices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    variantId: integer("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // shopee | tiktok
    suggestedPriceCents: integer("suggested_price_cents").notNull().default(0),
    practicedPriceCents: integer("practiced_price_cents").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("variant_prices_variant_channel_idx").on(t.variantId, t.channel),
    index("variant_prices_variant_idx").on(t.variantId),
  ],
);

export const variantPriceRelations = relations(variantPrices, ({ one }) => ({
  variant: one(variants, { fields: [variantPrices.variantId], references: [variants.id] }),
}));

/* ============================== ChannelFeeTier ============================== */

export const channelFeeTiers = sqliteTable(
  "channel_fee_tiers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    channel: text("channel").notNull(), // shopee | tiktok
    minCents: integer("min_cents").notNull(), // faixa mínima (inclusiva)
    maxCents: integer("max_cents"), // faixa máxima (inclusiva); null = aberto acima
    commissionBps: integer("commission_bps").notNull().default(0), // comissão % (0..10000)
    fixedCents: integer("fixed_cents").notNull().default(0), // taxa fixa (R$)
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("channel_fee_tiers_channel_min_max_idx").on(t.channel, t.minCents, t.maxCents),
    index("channel_fee_tiers_channel_idx").on(t.channel),
  ],
);

export const channelFeeTierRelations = relations(channelFeeTiers, () => ({}));

/* ============================== Printer ============================== */

export const printers = sqliteTable(
  "printers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    acquisitionCents: integer("acquisition_cents").notNull().default(0),
    usefulLifeYears: integer("useful_life_years").notNull().default(3),
    powerWatts: integer("power_watts").notNull().default(0),
    maintenanceCentsPerHour: integer("maintenance_cents_per_hour").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("printers_active_idx").on(t.active)],
);

/* ============================ ProductCode ============================ */
/**
 * Multi-código por canal (D3): cProd do XML X variante.
 * `channel` = "shopee" | "tiktok" | "geral".
 * Sempre que o usuário vincula uma venda, o sistema aprende o código →
 * cria/atualiza esta tabela (auto-vinculação em imports futuros).
 */

export const productCodes = sqliteTable(
  "product_codes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    variantId: integer("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    channel: text("channel").notNull().default("geral"),
    normalizedCode: text("normalized_code").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("product_codes_channel_normalized_idx").on(t.channel, t.normalizedCode),
    index("product_codes_variant_idx").on(t.variantId),
  ],
);

export const productCodeRelations = relations(productCodes, ({ one }) => ({
  variant: one(variants, { fields: [productCodes.variantId], references: [variants.id] }),
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
    freightCents: integer("freight_cents").notNull().default(0), // vFrete da NFe (005)
    receivedCents: integer("received_cents"), // valor que cai na conta (005); null = pendente
    feeCents: integer("fee_cents").notNull().default(0), // derivado = (gross - freight) - received (somente-leitura)
    netCents: integer("net_cents").notNull(), // = received ?? gross (financeiro)
    liquidCents: integer("liquid_cents").notNull().default(0), // = received - Σ(custo×qtd) (margem); 0 = pendente
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
    variantId: integer("variant_id").references(() => variants.id, { onDelete: "set null" }), // null = sem vínculo
    cProd: text("c_prod").notNull(), // código do produto no XML (bruto)
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    frozenCostCents: integer("frozen_cost_cents"), // congelado na venda (D6); null = sem custo
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("sale_items_sale_idx").on(t.saleId), index("sale_items_variant_idx").on(t.variantId)],
);

export const saleItemRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  variant: one(variants, { fields: [saleItems.variantId], references: [variants.id] }),
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
