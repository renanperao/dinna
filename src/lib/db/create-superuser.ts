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
 *
 * Usamos fetch direto contra /auth/v1/admin pra evitar o supabase-js, que
 * tenta inicializar o realtime e quebra em Node < 22 sem WebSocket nativo.
 */

import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

interface SupabaseUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

async function adminFetch(
  baseUrl: string,
  serviceKey: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${baseUrl}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function findUserByEmail(
  baseUrl: string,
  serviceKey: string,
  email: string,
): Promise<SupabaseUser | null> {
  // GoTrue admin list_users tem paginação via ?page=&per_page=
  let page = 1;
  const perPage = 200;
  while (true) {
    const res = await adminFetch(
      baseUrl,
      serviceKey,
      `/users?page=${page}&per_page=${perPage}`,
    );
    if (!res.ok) {
      throw new Error(`Falha ao listar usuários: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as { users: SupabaseUser[] };
    const found = body.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (body.users.length < perPage) return null;
    page += 1;
    if (page > 50) return null; // safety stop ~10k usuários
  }
}

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
  const baseUrl = supabaseUrl.replace(/\/+$/, "");

  console.log(`→ Procurando usuário ${email} no Supabase Auth...`);

  let authUserId: string | null = null;

  const createRes = await adminFetch(baseUrl, serviceRoleKey, "/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, signup_type: "superadmin" },
    }),
  });

  if (createRes.ok) {
    const created = (await createRes.json()) as SupabaseUser;
    authUserId = created.id;
    console.log(`  Criado em auth.users (${authUserId}).`);
  } else {
    const errBody = await createRes.text();
    const alreadyExists =
      errBody.toLowerCase().includes("already") ||
      errBody.toLowerCase().includes("registered") ||
      createRes.status === 422;

    if (!alreadyExists) {
      console.error(`Erro ao criar no Supabase Auth (${createRes.status}):`, errBody);
      process.exit(1);
    }

    console.log("  Já existe em auth.users. Buscando id...");
    const existing = await findUserByEmail(baseUrl, serviceRoleKey, email);
    if (!existing) {
      console.error("Usuário existe mas não foi encontrado em list_users.");
      process.exit(1);
    }
    authUserId = existing.id;

    const updateRes = await adminFetch(baseUrl, serviceRoleKey, `/users/${authUserId}`, {
      method: "PUT",
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: { ...(existing.user_metadata ?? {}), name, signup_type: "superadmin" },
      }),
    });
    if (!updateRes.ok) {
      console.error(`Erro ao atualizar senha (${updateRes.status}):`, await updateRes.text());
      process.exit(1);
    }
    console.log(`  Senha atualizada para o usuário existente (${authUserId}).`);
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
      .set({ isSuperadmin: true, name, email, isActive: true })
      .where(eq(users.id, authUserId));
    console.log("  Registro existente promovido a superadmin.");
  } else {
    await db.insert(users).values({
      id: authUserId,
      isSuperadmin: true,
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
