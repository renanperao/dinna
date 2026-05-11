-- Remove o valor "manager" do enum public.user_role.
--
-- COMO RODAR: Dashboard Supabase → SQL Editor → cole tudo isso → Run.
-- Postgres não permite DROP VALUE em enum, então recriamos o tipo.
--
-- Antes de rodar, este script migra qualquer usuário com role='manager' para 'owner'.
-- Ajuste o UPDATE se quiser outro fallback.

BEGIN;

-- 1) Migra dados existentes (se houver)
UPDATE public.users SET role = 'owner' WHERE role = 'manager';

-- 2) Renomeia o enum antigo
ALTER TYPE public.user_role RENAME TO user_role_old;

-- 3) Cria o enum novo sem "manager"
CREATE TYPE public.user_role AS ENUM ('owner', 'operator', 'kitchen', 'delivery');

-- 4) Aponta a coluna pro enum novo
ALTER TABLE public.users
  ALTER COLUMN role TYPE public.user_role
  USING role::text::public.user_role;

-- 5) Limpa o enum antigo
DROP TYPE public.user_role_old;

COMMIT;
