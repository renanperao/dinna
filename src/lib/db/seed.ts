import { db } from "./index";
import {
  restaurants,
  categories,
  products,
  productSizes,
  productOptions,
} from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  await db.delete(productOptions);
  await db.delete(productSizes);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(restaurants);

  const [restaurant] = await db
    .insert(restaurants)
    .values({
      slug: "pizzaria-do-ze",
      name: "Pizzaria do Zé",
      logoUrl:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80",
      coverUrl:
        "https://images.unsplash.com/photo-1593504049359-74330189a345?w=1600&q=80",
      description:
        "A melhor pizza do bairro, no forno a lenha desde 1998. Massa fina, ingredientes frescos.",
      phone: "+5511999990000",
      whatsapp: "+5511999990000",
      address: {
        street: "Rua das Pizzas",
        number: "1998",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        cep: "01000-000",
        lat: -23.55052,
        lng: -46.633308,
      },
      businessHours: {
        mon: { open: "18:00", close: "23:30" },
        tue: { open: "18:00", close: "23:30" },
        wed: { open: "18:00", close: "23:30" },
        thu: { open: "18:00", close: "23:30" },
        fri: { open: "18:00", close: "00:30" },
        sat: { open: "18:00", close: "00:30" },
        sun: { open: "18:00", close: "23:00" },
      },
      deliveryZones: [
        { neighborhood: "Centro", fee: 5.0, maxMinutes: 30 },
        { neighborhood: "Vila Madalena", fee: 8.0, maxMinutes: 45 },
        { neighborhood: "Pinheiros", fee: 7.5, maxMinutes: 40 },
      ],
      minOrderValue: "30.00",
      pixKey: "pix@pizzariadoze.com.br",
      primaryColor: "#C41E3A",
      isActive: true,
    })
    .returning();

  const cats = await db
    .insert(categories)
    .values([
      { restaurantId: restaurant.id, name: "Pizzas Tradicionais", displayOrder: 1 },
      { restaurantId: restaurant.id, name: "Pizzas Especiais", displayOrder: 2 },
      { restaurantId: restaurant.id, name: "Pizzas Doces", displayOrder: 3 },
      { restaurantId: restaurant.id, name: "Bebidas", displayOrder: 4 },
      { restaurantId: restaurant.id, name: "Sobremesas", displayOrder: 5 },
    ])
    .returning();

  const [tradicional, especial, doce, bebidas, sobremesa] = cats;

  const PIZZA_IMG = (q: string) =>
    `https://images.unsplash.com/photo-${q}?w=600&q=80`;

  const pizzasTradicionais = [
    {
      name: "Margherita",
      description: "Molho de tomate, mussarela, manjericão fresco, azeite",
      ingredients: ["mussarela", "tomate", "manjericão", "azeite"],
      image: PIZZA_IMG("1604068549290-dea0e4a305ca"),
      tags: ["vegetariana"],
    },
    {
      name: "Calabresa",
      description: "Molho, mussarela, calabresa fatiada, cebola, orégano",
      ingredients: ["mussarela", "calabresa", "cebola", "orégano"],
      image: PIZZA_IMG("1601925260368-ae2f83cf8b7f"),
      tags: [],
    },
    {
      name: "Portuguesa",
      description: "Mussarela, presunto, ovo, cebola, ervilha, azeitona",
      ingredients: ["mussarela", "presunto", "ovo", "cebola", "ervilha", "azeitona"],
      image: PIZZA_IMG("1574071318508-1cdbab80d002"),
      tags: [],
    },
    {
      name: "Quatro Queijos",
      description: "Mussarela, provolone, gorgonzola, parmesão",
      ingredients: ["mussarela", "provolone", "gorgonzola", "parmesão"],
      image: PIZZA_IMG("1571066811602-716837d681de"),
      tags: ["vegetariana"],
    },
    {
      name: "Frango com Catupiry",
      description: "Frango desfiado, catupiry, milho, mussarela",
      ingredients: ["frango", "catupiry", "milho", "mussarela"],
      image: PIZZA_IMG("1565299624946-b28f40a0ae38"),
      tags: [],
    },
  ];

  const pizzasEspeciais = [
    {
      name: "Pepperoni Premium",
      description: "Mussarela de búfala, pepperoni italiano, mel trufado",
      ingredients: ["mussarela de búfala", "pepperoni", "mel trufado"],
      image: PIZZA_IMG("1628840042765-356cda07504e"),
      tags: ["picante"],
    },
    {
      name: "Vegana do Chef",
      description: "Molho rústico, queijo vegano, abobrinha, berinjela, tomate seco",
      ingredients: ["queijo vegano", "abobrinha", "berinjela", "tomate seco"],
      image: PIZZA_IMG("1588315029754-2dd089d39a1a"),
      tags: ["vegana"],
    },
  ];

  const insertedPizzas: Array<{ id: string; name: string }> = [];

  for (const p of pizzasTradicionais) {
    const [row] = await db
      .insert(products)
      .values({
        restaurantId: restaurant.id,
        categoryId: tradicional.id,
        type: "pizza",
        name: p.name,
        description: p.description,
        imageUrl: p.image,
        tags: p.tags,
        ingredients: p.ingredients,
        isAvailable: true,
        isFeatured: p.name === "Margherita",
      })
      .returning({ id: products.id, name: products.name });
    insertedPizzas.push(row);
  }

  for (const p of pizzasEspeciais) {
    const [row] = await db
      .insert(products)
      .values({
        restaurantId: restaurant.id,
        categoryId: especial.id,
        type: "pizza",
        name: p.name,
        description: p.description,
        imageUrl: p.image,
        tags: p.tags,
        ingredients: p.ingredients,
        isAvailable: true,
        isFeatured: p.name === "Pepperoni Premium",
      })
      .returning({ id: products.id, name: products.name });
    insertedPizzas.push(row);
  }

  // Sweet pizza
  const [chocolatePizza] = await db
    .insert(products)
    .values({
      restaurantId: restaurant.id,
      categoryId: doce.id,
      type: "pizza",
      name: "Chocolate com Morango",
      description: "Chocolate ao leite, morangos frescos, leite condensado",
      imageUrl: PIZZA_IMG("1565958011703-44f9829ba187"),
      tags: ["doce"],
      ingredients: ["chocolate", "morango", "leite condensado"],
      isAvailable: true,
    })
    .returning({ id: products.id, name: products.name });
  insertedPizzas.push(chocolatePizza);

  // Sizes for every pizza (5 prices per pizza)
  const sizeTemplate = [
    { name: "P", diameterCm: 25, slices: 4, maxFlavors: 1, deltaP: 0 },
    { name: "M", diameterCm: 30, slices: 6, maxFlavors: 2, deltaP: 12 },
    { name: "G", diameterCm: 35, slices: 8, maxFlavors: 2, deltaP: 24 },
    { name: "GG", diameterCm: 40, slices: 12, maxFlavors: 4, deltaP: 38 },
  ];

  const basePriceByPizza: Record<string, number> = {
    Margherita: 39.9,
    Calabresa: 42.9,
    Portuguesa: 44.9,
    "Quatro Queijos": 49.9,
    "Frango com Catupiry": 46.9,
    "Pepperoni Premium": 64.9,
    "Vegana do Chef": 59.9,
    "Chocolate com Morango": 49.9,
  };

  for (const pizza of insertedPizzas) {
    const base = basePriceByPizza[pizza.name] ?? 39.9;
    await db.insert(productSizes).values(
      sizeTemplate.map((s, i) => ({
        productId: pizza.id,
        name: s.name,
        diameterCm: s.diameterCm,
        slices: s.slices,
        maxFlavors: s.maxFlavors,
        price: (base + s.deltaP).toFixed(2),
        displayOrder: i,
      })),
    );
  }

  // Beverages (no sizes, basePrice direto)
  const beverages = [
    { name: "Coca-Cola Lata 350ml", price: 6.9, image: PIZZA_IMG("1554866585-cd94860890b7") },
    { name: "Coca-Cola 2L", price: 14.9, image: PIZZA_IMG("1543253687-c931c8e01820") },
    { name: "Guaraná Antarctica 2L", price: 12.9, image: PIZZA_IMG("1623123-b00ec6406b81") },
    { name: "Suco de Laranja 500ml", price: 9.9, image: PIZZA_IMG("1613478223719-2ab802602423") },
    { name: "Água Mineral 500ml", price: 4.5, image: PIZZA_IMG("1606168094336-48f8b0c8d1e3") },
  ];

  for (const b of beverages) {
    await db.insert(products).values({
      restaurantId: restaurant.id,
      categoryId: bebidas.id,
      type: "beverage",
      name: b.name,
      description: null,
      imageUrl: b.image,
      basePrice: b.price.toFixed(2),
      isAvailable: true,
    });
  }

  // Dessert
  await db.insert(products).values({
    restaurantId: restaurant.id,
    categoryId: sobremesa.id,
    type: "dessert",
    name: "Brownie com Sorvete",
    description: "Brownie quentinho com bola de sorvete de creme",
    imageUrl: PIZZA_IMG("1551024506-0bccd828d307"),
    basePrice: "18.90",
    isAvailable: true,
  });

  // Borders (only for pizzas)
  const borders = [
    { name: "Sem borda", priceDelta: 0 },
    { name: "Catupiry", priceDelta: 8 },
    { name: "Cheddar", priceDelta: 8 },
    { name: "Cream cheese", priceDelta: 9 },
    { name: "Chocolate", priceDelta: 10 },
  ];

  await db.insert(productOptions).values(
    borders.map((b, i) => ({
      restaurantId: restaurant.id,
      groupName: "Borda",
      name: b.name,
      priceDelta: b.priceDelta.toFixed(2),
      isRequired: false,
      maxSelections: 1,
      displayOrder: i,
      appliesToType: "pizza" as const,
    })),
  );

  // Massa
  const massas = [
    { name: "Tradicional", priceDelta: 0 },
    { name: "Integral", priceDelta: 4 },
    { name: "Sem glúten", priceDelta: 8 },
  ];

  await db.insert(productOptions).values(
    massas.map((m, i) => ({
      restaurantId: restaurant.id,
      groupName: "Massa",
      name: m.name,
      priceDelta: m.priceDelta.toFixed(2),
      isRequired: false,
      maxSelections: 1,
      displayOrder: i,
      appliesToType: "pizza" as const,
    })),
  );

  console.log("✅ Seed concluído!");
  console.log(`   Restaurante: ${restaurant.name} (slug: ${restaurant.slug})`);
  console.log(`   Categorias: ${cats.length}`);
  console.log(`   Pizzas: ${insertedPizzas.length}`);
  console.log(`   Bebidas: ${beverages.length}`);
  console.log("");
  console.log("👉 Acesse http://localhost:3000/pizzaria-do-ze");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed falhou:", err);
  process.exit(1);
});
