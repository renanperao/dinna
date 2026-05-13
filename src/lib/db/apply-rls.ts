/**
 * Reaplica as políticas RLS do arquivo supabase/rls.sql.
 *
 * Necessário depois que um `pnpm db:push` derruba as policies (drizzle-kit
 * não conhece as policies definidas direto no Supabase e considera drift).
 *
 * Uso:
 *   pnpm db:apply-rls
 *
 * O SQL é idempotente (DROP IF EXISTS + CREATE), pode rodar quantas vezes
 * quiser. Usa a DATABASE_URL (role postgres), que tem permissão pra criar
 * policies.
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

  const sqlPath = resolve(process.cwd(), "supabase", "rls.sql");
  const sql = readFileSync(sqlPath, "utf8");

  console.log(`→ Aplicando ${sqlPath}...`);

  const client = postgres(connectionString, { max: 1 });
  try {
    await client.unsafe(sql);
  } finally {
    await client.end();
  }

  console.log("\n✓ RLS reaplicado.");
  console.log("  Verifique no Supabase Studio: SQL Editor → SELECT * FROM pg_policies WHERE schemaname = 'public';");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
