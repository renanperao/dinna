import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  serial,
  date,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const productTypeEnum = pgEnum("product_type", [
  "pizza",
  "beverage",
  "side",
  "dessert",
  "combo",
  "other",
]);

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "operator",
  "kitchen",
  "delivery",
]);

export const orderTypeEnum = pgEnum("order_type", ["delivery", "pickup", "dine_in"]);

export const orderStatusEnum = pgEnum("order_status", [
  "awaiting_payment",
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "pix",
  "credit",
  "debit",
  "cash",
  "meal_voucher",
  "on_delivery_card",
  "on_delivery_cash",
  "fiado",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "refunded",
  "failed",
]);

export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  description: text("description"),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp").notNull(),
  address: jsonb("address").$type<{
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    lat?: number;
    lng?: number;
  }>().notNull(),
  businessHours: jsonb("business_hours").$type<
    Record<
      "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
      { open: string; close: string; closed?: boolean }
    >
  >().notNull(),
  deliveryZones: jsonb("delivery_zones").$type<
    Array<{ neighborhood: string; fee: number; maxMinutes: number }>
  >(),
  deliveryRadiusKm: numeric("delivery_radius_km", { precision: 4, scale: 1 }),
  deliveryFeePerKm: numeric("delivery_fee_per_km", { precision: 6, scale: 2 }),
  minOrderValue: numeric("min_order_value", { precision: 8, scale: 2 }).default("0"),
  pixKey: text("pix_key"),
  primaryColor: text("primary_color").default("#C41E3A"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    isActive: boolean("is_active").default(true),
    availableHours: jsonb("available_hours"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_categories_active").on(t.restaurantId, t.displayOrder)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    type: productTypeEnum("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    basePrice: numeric("base_price", { precision: 8, scale: 2 }),
    isAvailable: boolean("is_available").default(true),
    isFeatured: boolean("is_featured").default(false),
    tags: text("tags").array(),
    displayOrder: integer("display_order").default(0),
    ingredients: text("ingredients").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_products_restaurant").on(t.restaurantId)],
);

export const productSizes = pgTable("product_sizes", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  diameterCm: integer("diameter_cm"),
  slices: integer("slices"),
  maxFlavors: integer("max_flavors").default(1),
  price: numeric("price", { precision: 8, scale: 2 }).notNull(),
  displayOrder: integer("display_order").default(0),
});

export const productOptions = pgTable("product_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .references(() => restaurants.id, { onDelete: "cascade" })
    .notNull(),
  groupName: text("group_name").notNull(),
  name: text("name").notNull(),
  priceDelta: numeric("price_delta", { precision: 8, scale: 2 }).default("0"),
  priceBySize: jsonb("price_by_size").$type<Record<string, number>>(),
  isRequired: boolean("is_required").default(false),
  maxSelections: integer("max_selections").default(1),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  appliesToType: productTypeEnum("applies_to_type"),
});

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),
    phone: text("phone").notNull(),
    name: text("name"),
    email: text("email"),
    birthday: date("birthday"),
    loyaltyPoints: integer("loyalty_points").default(0),
    totalOrders: integer("total_orders").default(0),
    totalSpent: numeric("total_spent", { precision: 10, scale: 2 }).default("0"),
    avgTicket: numeric("avg_ticket", { precision: 8, scale: 2 }).default("0"),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
    tags: text("tags").array(),
    isBlocked: boolean("is_blocked").default(false),
    notes: text("notes"),
    marketingOptOut: boolean("marketing_opt_out").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_customer_restaurant_phone").on(t.restaurantId, t.phone),
    index("idx_customers_phone").on(t.restaurantId, t.phone),
  ],
);

export const customerAddresses = pgTable("customer_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .references(() => customers.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label"),
  cep: text("cep"),
  street: text("street").notNull(),
  number: text("number"),
  complement: text("complement"),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  reference: text("reference"),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),
    number: serial("number"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerPhone: text("customer_phone").notNull(),
    customerName: text("customer_name").notNull(),
    type: orderTypeEnum("type").notNull(),
    tableNumber: integer("table_number"),
    status: orderStatusEnum("status").default("awaiting_payment").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),

    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    deliveryFee: numeric("delivery_fee", { precision: 8, scale: 2 }).default("0"),
    discount: numeric("discount", { precision: 8, scale: 2 }).default("0"),
    couponCode: text("coupon_code"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),

    deliveryAddress: jsonb("delivery_address"),
    deliveryDistanceKm: numeric("delivery_distance_km", { precision: 5, scale: 2 }),
    deliveryMinutesEstimate: integer("delivery_minutes_estimate"),
    deliveryUserId: uuid("delivery_user_id").references(() => users.id),

    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("pending"),
    paymentProviderId: text("payment_provider_id"),
    pixQrCode: text("pix_qr_code"),
    pixCopyPaste: text("pix_copy_paste"),
    changeFor: numeric("change_for", { precision: 8, scale: 2 }),

    notes: text("notes"),
    source: text("source").default("website"),

    receivedAt: timestamp("received_at", { withTimezone: true }),
    preparingAt: timestamp("preparing_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    outForDeliveryAt: timestamp("out_for_delivery_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledReason: text("cancelled_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_orders_restaurant_status").on(t.restaurantId, t.status, t.createdAt),
    index("idx_orders_customer").on(t.customerId, t.createdAt),
  ],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id"),
  productName: text("product_name").notNull(),
  productType: text("product_type"),
  sizeName: text("size_name"),
  flavors: jsonb("flavors").$type<Array<{ name: string; percentage: number }>>(),
  options: jsonb("options").$type<Array<{ group: string; name: string; price: number }>>(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unit_price", { precision: 8, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
});

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .references(() => restaurants.id, { onDelete: "cascade" })
    .notNull(),
  code: text("code").notNull(),
  description: text("description"),
  discountType: text("discount_type").notNull(),
  discountValue: numeric("discount_value", { precision: 8, scale: 2 }).notNull(),
  minOrderValue: numeric("min_order_value", { precision: 8, scale: 2 }),
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").default(0),
  maxUsesPerCustomer: integer("max_uses_per_customer").default(1),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  applicableTo: jsonb("applicable_to"),
  isActive: boolean("is_active").default(true),
}, (t) => [uniqueIndex("uq_coupon_code").on(t.restaurantId, t.code)]);

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  categories: many(categories),
  products: many(products),
  options: many(productOptions),
  orders: many(orders),
  customers: many(customers),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [categories.restaurantId],
    references: [restaurants.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [products.restaurantId],
    references: [restaurants.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  sizes: many(productSizes),
}));

export const productSizesRelations = relations(productSizes, ({ one }) => ({
  product: one(products, {
    fields: [productSizes.productId],
    references: [products.id],
  }),
}));

export const productOptionsRelations = relations(productOptions, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [productOptions.restaurantId],
    references: [restaurants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [customers.restaurantId],
    references: [restaurants.id],
  }),
  addresses: many(customerAddresses),
  orders: many(orders),
}));

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  customer: one(customers, {
    fields: [customerAddresses.customerId],
    references: [customers.id],
  }),
}));

export type Restaurant = typeof restaurants.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductSize = typeof productSizes.$inferSelect;
export type ProductOption = typeof productOptions.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
