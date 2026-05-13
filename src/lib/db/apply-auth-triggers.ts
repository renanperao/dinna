/**
 * Reaplica os triggers de auth (supabase/auth-triggers.sql).
 *
 * Idempotente. Use depois de mudar handle_new_user.
 *
 * Uso: pnpm db:apply-auth-triggers
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

  const sqlPath = resolve(process.cwd(), "supabase", "auth-triggers.sql");
  const sql = readFileSync(sqlPath, "utf8");

  console.log(`→ Aplicando ${sqlPath}...`);

  const client = postgres(connectionString, { max: 1 });
  try {
    await client.unsafe(sql);
  } finally {
    await client.end();
  }
  console.log("✓ Triggers de auth reaplicados.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
