import "dotenv/config";
import { db } from "./index";
import {
  restaurants, categories, products, productSizes, productOptions,
  orders, orderItems, customers,
} from "./schema";
/* ── Helper ─────────────────────────────────────────── */
const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=80`;

const SIZES = [
  { name: "P", diameterCm: 25, slices: 4, maxFlavors: 1, delta: 0 },
  { name: "M", diameterCm: 30, slices: 6, maxFlavors: 2, delta: 12 },
  { name: "G", diameterCm: 35, slices: 8, maxFlavors: 2, delta: 24 },
  { name: "GG", diameterCm: 40, slices: 12, maxFlavors: 4, delta: 38 },
];

type RestaurantAddress = {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  lat?: number;
  lng?: number;
};

type BusinessHours = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  { open: string; close: string; closed?: boolean }
>;

type DeliveryZone = { neighborhood: string; fee: number; maxMinutes: number };

async function seedRestaurant(data: {
  slug: string;
  name: string;
  description: string;
  phone: string;
  whatsapp: string;
  primaryColor: string;
  logoUrl: string;
  coverUrl: string;
  address: RestaurantAddress;
  businessHours: BusinessHours;
  deliveryZones: DeliveryZone[];
  pixKey: string;
  pizzas: { name: string; desc: string; img: string; base: number; special?: boolean; tags?: string[] }[];
}) {
  const [r] = await db.insert(restaurants).values({
    slug: data.slug,
    name: data.name,
    description: data.description,
    phone: data.phone,
    whatsapp: data.whatsapp,
    primaryColor: data.primaryColor,
    logoUrl: data.logoUrl,
    coverUrl: data.coverUrl,
    address: data.address,
    businessHours: data.businessHours,
    deliveryZones: data.deliveryZones,
    pixKey: data.pixKey,
    minOrderValue: "30.00",
    isActive: true,
  }).returning();

  const [catPizzas, catEspeciais, catBebidas, catSobremesas] = await db.insert(categories).values([
    { restaurantId: r.id, name: "Pizzas Tradicionais", displayOrder: 1 },
    { restaurantId: r.id, name: "Pizzas Especiais",    displayOrder: 2 },
    { restaurantId: r.id, name: "Bebidas",             displayOrder: 3 },
    { restaurantId: r.id, name: "Sobremesas",          displayOrder: 4 },
  ]).returning();

  const insertedPizzas: { id: string; name: string; base: number }[] = [];

  for (const p of data.pizzas) {
    const [row] = await db.insert(products).values({
      restaurantId: r.id,
      categoryId: p.special ? catEspeciais.id : catPizzas.id,
      type: "pizza",
      name: p.name,
      description: p.desc,
      imageUrl: p.img,
      tags: p.tags ?? [],
      isAvailable: true,
      isFeatured: false,
    }).returning({ id: products.id, name: products.name });
    insertedPizzas.push({ id: row.id, name: row.name, base: p.base });
  }

  for (const pizza of insertedPizzas) {
    await db.insert(productSizes).values(
      SIZES.map((s, i) => ({
        productId: pizza.id,
        name: s.name,
        diameterCm: s.diameterCm,
        slices: s.slices,
        maxFlavors: s.maxFlavors,
        price: (pizza.base + s.delta).toFixed(2),
        displayOrder: i,
      })),
    );
  }

  const beverages = [
    { name: "Coca-Cola Lata 350ml", price: "6.90", img: IMG("1554866585-cd94860890b7") },
    { name: "Coca-Cola 2L",         price: "14.90", img: IMG("1543253687-c931c8e01820") },
    { name: "Guaraná Antarctica 2L",price: "12.90", img: IMG("1554866585-cd94860890b7") },
    { name: "Água Mineral 500ml",   price: "4.50",  img: IMG("1606168094336-48f8b0c8d1e3") },
  ];
  for (const b of beverages) {
    await db.insert(products).values({ restaurantId: r.id, categoryId: catBebidas.id, type: "beverage", name: b.name, basePrice: b.price, imageUrl: b.img, isAvailable: true });
  }

  await db.insert(products).values({ restaurantId: r.id, categoryId: catSobremesas.id, type: "dessert", name: "Brownie com Sorvete", description: "Brownie quentinho com sorvete de creme", basePrice: "18.90", isAvailable: true });

  await db.insert(productOptions).values([
    { restaurantId: r.id, groupName: "Borda", name: "Sem borda",    priceDelta: "0.00", isRequired: false, maxSelections: 1, displayOrder: 0, appliesToType: "pizza" as const },
    { restaurantId: r.id, groupName: "Borda", name: "Catupiry",     priceDelta: "8.00", isRequired: false, maxSelections: 1, displayOrder: 1, appliesToType: "pizza" as const },
    { restaurantId: r.id, groupName: "Borda", name: "Cheddar",      priceDelta: "8.00", isRequired: false, maxSelections: 1, displayOrder: 2, appliesToType: "pizza" as const },
    { restaurantId: r.id, groupName: "Massa", name: "Tradicional",  priceDelta: "0.00", isRequired: false, maxSelections: 1, displayOrder: 0, appliesToType: "pizza" as const },
    { restaurantId: r.id, groupName: "Massa", name: "Integral",     priceDelta: "4.00", isRequired: false, maxSelections: 1, displayOrder: 1, appliesToType: "pizza" as const },
    { restaurantId: r.id, groupName: "Massa", name: "Sem glúten",   priceDelta: "8.00", isRequired: false, maxSelections: 1, displayOrder: 2, appliesToType: "pizza" as const },
  ]);

  return r;
}

/* ── Main ───────────────────────────────────────────── */
async function seedAll() {
  console.log("🌱 Criando 3 pizzarias...\n");

  // Wipe everything
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(customers);
  await db.delete(productOptions);
  await db.delete(productSizes);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(restaurants);

  /* ─ 1. Dinna Pizza ─ */
  const dinna = await seedRestaurant({
    slug: "dinna-pizza",
    name: "Dinna Pizza",
    description: "Pizza artesanal com massa de longa fermentação e ingredientes selecionados. O melhor da pizza napolitana em São Paulo.",
    phone: "+5511999990001",
    whatsapp: "+5511999990001",
    primaryColor: "#7C3AED",
    pixKey: "pix@dinnapizza.com.br",
    logoUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80",
    coverUrl: "https://images.unsplash.com/photo-1593504049359-74330189a345?w=1600&q=80",
    address: { street: "Rua Haddock Lobo", number: "421", neighborhood: "Jardins", city: "São Paulo", state: "SP", cep: "01414-001" },
    businessHours: {
      mon: { open: "18:00", close: "23:30" }, tue: { open: "18:00", close: "23:30" },
      wed: { open: "18:00", close: "23:30" }, thu: { open: "18:00", close: "23:30" },
      fri: { open: "18:00", close: "00:30" }, sat: { open: "18:00", close: "00:30" },
      sun: { open: "18:00", close: "23:00" },
    },
    deliveryZones: [
      { neighborhood: "Jardins", fee: 5.0, maxMinutes: 30 },
      { neighborhood: "Vila Madalena", fee: 8.0, maxMinutes: 45 },
      { neighborhood: "Pinheiros", fee: 7.5, maxMinutes: 40 },
    ],
    pizzas: [
      { name: "Margherita", desc: "Molho San Marzano, fior di latte, manjericão fresco, azeite EVO", img: IMG("1604068549290-dea0e4a305ca"), base: 39.9, tags: ["vegetariana"] },
      { name: "Calabresa Artesanal", desc: "Calabresa curada, cebola roxa, mussarela, orégano", img: IMG("1601925260368-ae2f83cf8b7f"), base: 44.9 },
      { name: "Quatro Queijos", desc: "Mussarela, provolone, gorgonzola, parmesão", img: IMG("1571066811602-716837d681de"), base: 49.9, tags: ["vegetariana"] },
      { name: "Frango com Catupiry", desc: "Frango desfiado, catupiry, milho, mussarela", img: IMG("1565299624946-b28f40a0ae38"), base: 46.9 },
      { name: "Pepperoni Premium", desc: "Mussarela de búfala, pepperoni italiano, mel trufado", img: IMG("1628840042765-356cda07504e"), base: 64.9, special: true, tags: ["destaque"] },
      { name: "Vegana do Chef", desc: "Molho rústico, queijo vegano, abobrinha, berinjela, tomate seco", img: IMG("1588315029754-2dd089d39a1a"), base: 59.9, special: true, tags: ["vegana"] },
    ],
  });
  console.log(`  ✅ ${dinna.name} (/${dinna.slug})`);

  /* ─ 2. Flash Pizza ─ */
  const flash = await seedRestaurant({
    slug: "flash-pizza",
    name: "Flash Pizza",
    description: "Entrega ultrarrápida em até 30 minutos. Pizza boa, quente e no seu tempo!",
    phone: "+5511999990002",
    whatsapp: "+5511999990002",
    primaryColor: "#F59E0B",
    pixKey: "pix@flashpizza.com.br",
    logoUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&q=80",
    coverUrl: "https://images.unsplash.com/photo-1571066811602-716837d681de?w=1600&q=80",
    address: { street: "Av. Brigadeiro Faria Lima", number: "2894", neighborhood: "Itaim Bibi", city: "São Paulo", state: "SP", cep: "04538-132" },
    businessHours: {
      mon: { open: "17:00", close: "23:00" }, tue: { open: "17:00", close: "23:00" },
      wed: { open: "17:00", close: "23:00" }, thu: { open: "17:00", close: "23:00" },
      fri: { open: "17:00", close: "00:00" }, sat: { open: "17:00", close: "00:00" },
      sun: { open: "17:00", close: "22:00" },
    },
    deliveryZones: [
      { neighborhood: "Itaim Bibi", fee: 4.0, maxMinutes: 25 },
      { neighborhood: "Moema",      fee: 6.0, maxMinutes: 30 },
      { neighborhood: "Brooklin",   fee: 7.0, maxMinutes: 35 },
    ],
    pizzas: [
      { name: "Flash Especial", desc: "Mussarela, calabresa, frango, bacon, palmito, milho", img: IMG("1565299624946-b28f40a0ae38"), base: 52.9, tags: ["mais pedida"] },
      { name: "Portuguesa",     desc: "Mussarela, presunto, ovo, cebola, ervilha, azeitona", img: IMG("1574071318508-1cdbab80d002"), base: 44.9 },
      { name: "Mussarela",      desc: "Mussarela, molho de tomate, orégano — simples e irresistível", img: IMG("1604068549290-dea0e4a305ca"), base: 38.9, tags: ["vegetariana"] },
      { name: "Bacon com Cheddar", desc: "Bacon crocante, cheddar cremoso, cebola caramelizada", img: IMG("1628840042765-356cda07504e"), base: 54.9, special: true },
      { name: "Frango Gourmet", desc: "Frango, catupiry, milho, tomate seco, rúcula", img: IMG("1571066811602-716837d681de"), base: 49.9, special: true },
    ],
  });
  console.log(`  ✅ ${flash.name} (/${flash.slug})`);

  /* ─ 3. Dom Pizza ─ */
  const dom = await seedRestaurant({
    slug: "dom-pizza",
    name: "Dom Pizza",
    description: "Tradição de família desde 1985. Receita original, massa grossa, sabor autêntico de pizzaria italiana.",
    phone: "+5511999990003",
    whatsapp: "+5511999990003",
    primaryColor: "#16A34A",
    pixKey: "pix@dompizza.com.br",
    logoUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=200&q=80",
    coverUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=1600&q=80",
    address: { street: "Rua Vergueiro", number: "3185", neighborhood: "Vila Mariana", city: "São Paulo", state: "SP", cep: "04101-300" },
    businessHours: {
      mon: { open: "19:00", close: "23:30" }, tue: { open: "19:00", close: "23:30" },
      wed: { open: "19:00", close: "23:30" }, thu: { open: "19:00", close: "23:30" },
      fri: { open: "19:00", close: "01:00" }, sat: { open: "19:00", close: "01:00" },
      sun: { open: "19:00", close: "23:00" },
    },
    deliveryZones: [
      { neighborhood: "Vila Mariana",  fee: 5.0, maxMinutes: 35 },
      { neighborhood: "Ipiranga",      fee: 7.0, maxMinutes: 45 },
      { neighborhood: "Saúde",         fee: 6.0, maxMinutes: 40 },
    ],
    pizzas: [
      { name: "Dom Especial",  desc: "Receita da família: calabresa, tomate, azeitona, ovo, queijo", img: IMG("1601925260368-ae2f83cf8b7f"), base: 48.9, tags: ["tradicional"] },
      { name: "Margherita",    desc: "Molho de tomate, mussarela, manjericão, orégano — a clássica", img: IMG("1604068549290-dea0e4a305ca"), base: 41.9, tags: ["vegetariana"] },
      { name: "Quatro Carnes", desc: "Calabresa, frango, bacon, pepperoni, mussarela", img: IMG("1628840042765-356cda07504e"), base: 58.9, special: true, tags: ["destaque"] },
      { name: "Napolitana",    desc: "Molho, mussarela, tomate fresco, parmesão, alho, azeite", img: IMG("1571066811602-716837d681de"), base: 45.9 },
      { name: "Portuguesa Clássica", desc: "Presunto, mussarela, ovo cozido, cebola, ervilha, azeitona preta", img: IMG("1574071318508-1cdbab80d002"), base: 46.9 },
    ],
  });
  console.log(`  ✅ ${dom.name} (/${dom.slug})`);

  /* ─ Demo orders for each ─ */
  console.log("\n🧾 Gerando pedidos de demonstração...");

  const DEMO_PEOPLE = [
    { name: "Ana Souza",      phone: "+5511988881111" },
    { name: "Carlos Mendes",  phone: "+5511977772222" },
    { name: "Beatriz Lima",   phone: "+5511966663333" },
    { name: "Diego Alves",    phone: "+5511955554444" },
    { name: "Fernanda Costa", phone: "+5511944445555" },
  ];

  for (const restaurant of [dinna, flash, dom]) {
    const customerIds: Record<string, string> = {};
    for (const p of DEMO_PEOPLE) {
      const [c] = await db.insert(customers).values({ restaurantId: restaurant.id, phone: p.phone, name: p.name }).returning({ id: customers.id });
      customerIds[p.phone] = c.id;
    }

    const statuses = ["received", "preparing", "ready", "out_for_delivery", "delivered"] as const;
    const pays     = ["pix", "credit", "on_delivery_cash", "pix", "debit"] as const;
    const now = new Date();

    for (let i = 0; i < 5; i++) {
      const person = DEMO_PEOPLE[i];
      const createdAt = new Date(now.getTime() - (5 - i) * 12 * 60000);
      const receivedAt = new Date(createdAt.getTime() + 30000);
      const total = (60 + i * 15).toFixed(2);
      const [ins] = await db.insert(orders).values({
        restaurantId: restaurant.id,
        customerId: customerIds[person.phone],
        customerPhone: person.phone,
        customerName: person.name,
        type: i % 2 === 0 ? "delivery" : "pickup",
        status: statuses[i],
        paymentMethod: pays[i],
        paymentStatus: statuses[i] === "delivered" ? "paid" : "pending",
        subtotal: total, deliveryFee: i % 2 === 0 ? "7.00" : "0.00", total,
        source: "website", createdAt, updatedAt: createdAt, receivedAt,
        preparingAt: i >= 1 ? new Date(receivedAt.getTime() + 2*60000) : null,
        readyAt: i >= 2 ? new Date(receivedAt.getTime() + 12*60000) : null,
        outForDeliveryAt: i >= 3 ? new Date(receivedAt.getTime() + 14*60000) : null,
        deliveredAt: i >= 4 ? new Date(receivedAt.getTime() + 35*60000) : null,
      }).returning({ id: orders.id });

      await db.insert(orderItems).values({
        orderId: ins.id,
        productName: `Pizza G ${["Margherita","Calabresa","Quatro Queijos","Pepperoni","Portuguesa"][i]}`,
        productType: "pizza",
        sizeName: "G",
        quantity: 1,
        unitPrice: total,
        totalPrice: total,
      });
    }

    // 10 historical delivered orders for analytics
    for (let d = 10; d >= 1; d--) {
      const person = DEMO_PEOPLE[d % DEMO_PEOPLE.length];
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - d);
      createdAt.setHours(19 + (d % 4), d % 60);
      const subtotal = (50 + (d * 7)).toFixed(2);
      const [ins] = await db.insert(orders).values({
        restaurantId: restaurant.id,
        customerId: customerIds[person.phone],
        customerPhone: person.phone, customerName: person.name,
        type: "delivery", status: "delivered", paymentMethod: "pix", paymentStatus: "paid",
        subtotal, deliveryFee: "6.00", total: (Number(subtotal) + 6).toFixed(2),
        source: "website", createdAt, updatedAt: createdAt,
        receivedAt: new Date(createdAt.getTime() + 30000),
        preparingAt: new Date(createdAt.getTime() + 3*60000),
        readyAt: new Date(createdAt.getTime() + 18*60000),
        deliveredAt: new Date(createdAt.getTime() + 40*60000),
      }).returning({ id: orders.id });
      await db.insert(orderItems).values({ orderId: ins.id, productName: "Pizza G Margherita", productType: "pizza", sizeName: "G", quantity: 1, unitPrice: subtotal, totalPrice: subtotal });
    }

    console.log(`  ✅ ${restaurant.name}: 5 ativos + 10 histórico`);
  }

  console.log(`
✅ Concluído! 3 restaurantes criados:
   🍕 Dinna Pizza  → http://localhost:3000/dinna-pizza
   ⚡ Flash Pizza  → http://localhost:3000/flash-pizza
   👑 Dom Pizza    → http://localhost:3000/dom-pizza

   Admin (qualquer):
   → http://localhost:3000/admin/dinna-pizza
   → http://localhost:3000/admin/flash-pizza
   → http://localhost:3000/admin/dom-pizza
`);
  process.exit(0);
}

seedAll().catch(err => { console.error("❌", err); process.exit(1); });
