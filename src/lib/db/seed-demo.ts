import "dotenv/config";
import { db } from "./index";
import { orders, orderItems, restaurants, customers } from "./schema";
import { eq } from "drizzle-orm";

const DEMO_PEOPLE = [
  { name: "Ana Souza",      phone: "+5511988881111" },
  { name: "Carlos Mendes",  phone: "+5511977772222" },
  { name: "Beatriz Lima",   phone: "+5511966663333" },
  { name: "Diego Alves",    phone: "+5511955554444" },
  { name: "Fernanda Costa", phone: "+5511944445555" },
  { name: "Rafael Torres",  phone: "+5511933336666" },
  { name: "Juliana Melo",   phone: "+5511922227777" },
  { name: "Bruno Castro",   phone: "+5511911118888" },
];

async function seedDemo() {
  console.log("🎭 Criando dados de demonstração completos...");

  const [restaurant] = await db
    .select({ id: restaurants.id, slug: restaurants.slug })
    .from(restaurants)
    .where(eq(restaurants.slug, "restaurante-demo"))
    .limit(1);

  if (!restaurant) {
    console.error("❌ Restaurante não encontrado. Rode pnpm db:seed primeiro.");
    process.exit(1);
  }

  // Clean
  await db.delete(orders).where(eq(orders.restaurantId, restaurant.id));
  await db.delete(customers).where(eq(customers.restaurantId, restaurant.id));

  // Upsert customers
  const customerIds: Record<string, string> = {};
  for (const p of DEMO_PEOPLE) {
    const [c] = await db
      .insert(customers)
      .values({ restaurantId: restaurant.id, phone: p.phone, name: p.name })
      .returning({ id: customers.id });
    customerIds[p.phone] = c.id;
    console.log(`  👤 Cliente: ${p.name}`);
  }

  // 5 active orders (for KDS)
  const activeOrders = [
    { person: DEMO_PEOPLE[0], type: "delivery" as const, status: "received" as const,       pay: "pix" as const,             sub: "86.80", fee: "5.00",  total: "91.80",  items: [{ name: "Pizza G Calabresa",        typ: "pizza",    qty: 1, unit: "71.90" }, { name: "Coca-Cola 2L",          typ: "beverage", qty: 1, unit: "14.90" }] },
    { person: DEMO_PEOPLE[1], type: "pickup" as const,   status: "preparing" as const,      pay: "credit" as const,          sub: "113.80",fee: "0.00", total: "113.80", items: [{ name: "Pizza G Frango Catupiry",  typ: "pizza",    qty: 1, unit: "70.90" }, { name: "Pizza M Margherita",    typ: "pizza",    qty: 1, unit: "51.90" }] },
    { person: DEMO_PEOPLE[2], type: "delivery" as const, status: "ready" as const,          pay: "on_delivery_cash" as const, sub: "86.80", fee: "7.50",  total: "94.30",  items: [{ name: "Pizza G Quatro Queijos",  typ: "pizza",    qty: 1, unit: "73.90" }, { name: "Guaraná Antarctica 2L", typ: "beverage", qty: 1, unit: "12.90" }] },
    { person: DEMO_PEOPLE[3], type: "delivery" as const, status: "out_for_delivery" as const,pay: "pix" as const,            sub: "78.90", fee: "8.00",  total: "86.90",  items: [{ name: "Pizza G Pepperoni",       typ: "pizza",    qty: 1, unit: "78.90" }] },
    { person: DEMO_PEOPLE[4], type: "pickup" as const,   status: "delivered" as const,      pay: "debit" as const,           sub: "104.80",fee: "0.00", total: "104.80", items: [{ name: "Pizza G Portuguesa",     typ: "pizza",    qty: 2, unit: "52.40" }] },
  ];

  const now = new Date();
  let orderNum = 1;

  for (let i = 0; i < activeOrders.length; i++) {
    const o = activeOrders[i];
    const createdAt = new Date(now.getTime() - (activeOrders.length - i) * 12 * 60000);
    const receivedAt = new Date(createdAt.getTime() + 30000);
    const [ins] = await db.insert(orders).values({
      restaurantId: restaurant.id,
      customerId: customerIds[o.person.phone],
      customerPhone: o.person.phone,
      customerName: o.person.name,
      type: o.type, status: o.status, paymentMethod: o.pay, paymentStatus: "pending",
      subtotal: o.sub, deliveryFee: o.fee, total: o.total,
      source: "website", createdAt, updatedAt: createdAt, receivedAt,
      preparingAt: ["preparing","ready","out_for_delivery","delivered"].includes(o.status) ? new Date(receivedAt.getTime()+2*60000) : null,
      readyAt: ["ready","out_for_delivery","delivered"].includes(o.status) ? new Date(receivedAt.getTime()+12*60000) : null,
      outForDeliveryAt: ["out_for_delivery","delivered"].includes(o.status) ? new Date(receivedAt.getTime()+14*60000) : null,
      deliveredAt: o.status==="delivered" ? new Date(receivedAt.getTime()+35*60000) : null,
    }).returning({ id: orders.id });
    for (const item of o.items) {
      await db.insert(orderItems).values({ orderId: ins.id, productName: item.name, productType: item.typ, sizeName: "G", quantity: item.qty, unitPrice: item.unit, totalPrice: (Number(item.unit)*item.qty).toFixed(2) });
    }
    console.log(`  ✓ #${orderNum++} ${o.person.name} (${o.status})`);
  }

  // Historical delivered orders (last 30 days for analytics)
  const hist = [
    { p: DEMO_PEOPLE[0], sub: "91.80",  fee: "5.00",  total: "96.80",  pay: "pix" as const,    type: "delivery" as const, items: [{ name: "Pizza G Calabresa",        typ: "pizza",    qty: 1, unit: "91.80" }] },
    { p: DEMO_PEOPLE[1], sub: "70.90",  fee: "0.00",  total: "70.90",  pay: "credit" as const, type: "pickup" as const,   items: [{ name: "Pizza G Portuguesa",       typ: "pizza",    qty: 1, unit: "70.90" }] },
    { p: DEMO_PEOPLE[2], sub: "56.80",  fee: "6.00",  total: "62.80",  pay: "pix" as const,    type: "delivery" as const, items: [{ name: "Coca-Cola 2L", qty: 2, unit: "14.90", typ: "beverage" }, { name: "Pizza P Margherita", qty: 1, unit: "39.90", typ: "pizza" }] },
    { p: DEMO_PEOPLE[5], sub: "139.80", fee: "7.50",  total: "147.30", pay: "debit" as const,  type: "delivery" as const, items: [{ name: "Pizza G Quatro Queijos",    typ: "pizza",    qty: 2, unit: "69.90" }] },
    { p: DEMO_PEOPLE[6], sub: "52.90",  fee: "5.00",  total: "57.90",  pay: "pix" as const,    type: "delivery" as const, items: [{ name: "Pizza M Calabresa",        typ: "pizza",    qty: 1, unit: "52.90" }] },
    { p: DEMO_PEOPLE[7], sub: "83.80",  fee: "8.00",  total: "91.80",  pay: "credit" as const, type: "delivery" as const, items: [{ name: "Pizza G Frango Catupiry",  typ: "pizza",    qty: 1, unit: "70.90" }, { name: "Guaraná 2L", qty: 1, unit: "12.90", typ: "beverage" }] },
    { p: DEMO_PEOPLE[3], sub: "78.90",  fee: "0.00",  total: "78.90",  pay: "cash" as const,   type: "pickup" as const,   items: [{ name: "Pizza G Pepperoni",        typ: "pizza",    qty: 1, unit: "78.90" }] },
    { p: DEMO_PEOPLE[4], sub: "66.80",  fee: "6.50",  total: "73.30",  pay: "pix" as const,    type: "delivery" as const, items: [{ name: "Pizza M Margherita",       typ: "pizza",    qty: 1, unit: "51.90" }, { name: "Brownie Especial", qty: 1, unit: "14.90", typ: "dessert" }] },
  ];

  for (let day = 29; day >= 1; day--) {
    const n = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < n; j++) {
      const t = hist[(day + j) % hist.length];
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - day);
      createdAt.setHours(Math.floor(Math.random() * 8) + 17, Math.floor(Math.random() * 60));
      const receivedAt = new Date(createdAt.getTime() + 30000);
      const [ins] = await db.insert(orders).values({
        restaurantId: restaurant.id,
        customerId: customerIds[t.p.phone],
        customerPhone: t.p.phone, customerName: t.p.name,
        type: t.type, status: "delivered", paymentMethod: t.pay, paymentStatus: "paid",
        subtotal: t.sub, deliveryFee: t.fee, total: t.total,
        source: "website", createdAt, updatedAt: createdAt, receivedAt,
        preparingAt: new Date(receivedAt.getTime()+3*60000),
        readyAt: new Date(receivedAt.getTime()+18*60000),
        deliveredAt: new Date(receivedAt.getTime()+40*60000),
      }).returning({ id: orders.id });
      for (const item of t.items) {
        await db.insert(orderItems).values({ orderId: ins.id, productName: item.name, productType: item.typ, quantity: item.qty, unitPrice: item.unit, totalPrice: (Number(item.unit)*item.qty).toFixed(2) });
      }
      orderNum++;
    }
  }

  console.log(`\n✅ Demo: ${orderNum-1} pedidos + ${DEMO_PEOPLE.length} clientes criados.`);
  console.log("   Cardápio: http://localhost:3000/restaurante-demo");
  console.log("   Cozinha:  http://localhost:3000/kitchen/restaurante-demo");
  console.log("   Admin:    http://localhost:3000/admin/restaurante-demo");
  console.log("   Desempenho: http://localhost:3000/admin/restaurante-demo/performance");
  console.log("   Produtos: http://localhost:3000/admin/restaurante-demo/performance/products");
  console.log("   Clientes: http://localhost:3000/admin/restaurante-demo/customers");
  process.exit(0);
}

seedDemo().catch((err) => { console.error("❌", err); process.exit(1); });
