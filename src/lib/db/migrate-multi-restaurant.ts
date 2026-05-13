/**
 * Aplica a migração multi-restaurant (supabase/migrations/02-multi-restaurant.sql).
 *
 * Faz backup automatico das colunas users.restaurant_id e users.role antes
 * de aplicar (cria public._users_legacy_backup). É idempotente.
 *
 * Uso: pnpm db:migrate-multi-restaurant
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL não definida no .env.local.");
    process.exit(1);
  }

  const sqlPath = resolve(process.cwd(), "supabase", "migrations", "02-multi-restaurant.sql");
  const sql = readFileSync(sqlPath, "utf8");

  console.log(`→ Aplicando ${sqlPath}...`);

  const client = postgres(connectionString, { max: 1 });
  try {
    // Backup de segurança caso o backfill dê pau
    await client.unsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='users' AND column_name='restaurant_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema='public' AND table_name='_users_legacy_backup'
        ) THEN
          CREATE TABLE public._users_legacy_backup AS
          SELECT id, restaurant_id, role, name, email, created_at FROM public.users;
        END IF;
      END $$;
    `);
    console.log("  Backup feito em public._users_legacy_backup (se aplicável).");

    await client.unsafe(sql);

    const { count } = (await client`SELECT COUNT(*)::int AS count FROM public.user_restaurants`)[0];
    const { count: superCount } = (await client`SELECT COUNT(*)::int AS count FROM public.users WHERE is_superadmin = true`)[0];

    console.log(`\n✓ Migração aplicada.`);
    console.log(`  user_restaurants: ${count} linha(s)`);
    console.log(`  superadmins: ${superCount}`);
    console.log(`\n  Próximo: pnpm db:apply-rls (pra recriar policies de RLS no novo modelo)`);
  } finally {
    await client.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
