/**
 * Cria um superuser que tem acesso a todos os restaurantes.
 *
 * Antes de rodar:
 *   1. .env.local com NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e DATABASE_URL.
 *   2. `pnpm db:push` para aplicar o enum atualizado (inclui o valor "superadmin").
 *
 * Uso:
 *   pnpm db:create-superuser <email> <senha> [nome]
 *
 * Reexecuções com o mesmo e-mail promovem o usuário existente a superadmin
 * (atualiza a senha se informada).
 */

import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

async function main() {
  const [emailArg, passwordArg, ...nameParts] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  const password = passwordArg?.trim();
  const name = nameParts.join(" ").trim() || "Superadmin";

  if (!email || !password) {
    console.error("Uso: pnpm db:create-superuser <email> <senha> [nome]");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("A senha precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`→ Procurando usuário ${email} no Supabase Auth...`);

  let authUserId: string | null = null;

  // Tenta criar; se já existe, busca e atualiza a senha.
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, signup_type: "superadmin" },
  });

  if (created.data.user) {
    authUserId = created.data.user.id;
    console.log(`  Criado em auth.users (${authUserId}).`);
  } else if (created.error?.message.toLowerCase().includes("already")) {
    console.log("  Já existe em auth.users. Buscando id...");
    const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (existing.error) {
      console.error("Erro ao listar usuários:", existing.error.message);
      process.exit(1);
    }
    const found = existing.data.users.find((u) => u.email?.toLowerCase() === email);
    if (!found) {
      console.error("Usuário existe mas não foi encontrado em listUsers. Aumente o perPage ou apague o usuário no Supabase Studio.");
      process.exit(1);
    }
    authUserId = found.id;
    const updated = await admin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      user_metadata: { ...found.user_metadata, name, signup_type: "superadmin" },
    });
    if (updated.error) {
      console.error("Erro ao atualizar senha:", updated.error.message);
      process.exit(1);
    }
    console.log(`  Senha atualizada para o usuário existente (${authUserId}).`);
  } else if (created.error) {
    console.error("Erro ao criar no Supabase Auth:", created.error.message);
    process.exit(1);
  }

  if (!authUserId) {
    console.error("Falha inesperada: sem id de usuário.");
    process.exit(1);
  }

  console.log("→ Upserting em public.users como superadmin...");

  const existingRow = await db.select().from(users).where(eq(users.id, authUserId)).limit(1);

  if (existingRow.length) {
    await db
      .update(users)
      .set({ role: "superadmin", restaurantId: null, name, email, isActive: true })
      .where(eq(users.id, authUserId));
    console.log("  Registro existente promovido a superadmin.");
  } else {
    await db.insert(users).values({
      id: authUserId,
      role: "superadmin",
      restaurantId: null,
      name,
      email,
      isActive: true,
    });
    console.log("  Registro criado.");
  }

  console.log("\n✓ Superuser pronto.");
  console.log(`  Email: ${email}`);
  console.log(`  Login: /login → /admin (lista de clientes)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
