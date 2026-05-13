-- Migração: introduz multi-tenancy de usuários (1 user → N restaurantes).
--
-- COMO RODAR: pnpm db:migrate-multi-restaurant
-- (ou cole no SQL Editor do Supabase Studio)
--
-- É idempotente: usa IF NOT EXISTS / IF EXISTS em tudo.

-- 1) Cria o enum membership_role (subset do user_role, sem 'superadmin')
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
    CREATE TYPE public.membership_role AS ENUM ('owner', 'operator', 'kitchen', 'delivery');
  END IF;
END $$;

-- 2) Cria a tabela user_restaurants
CREATE TABLE IF NOT EXISTS public.user_restaurants (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role public.membership_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_restaurant
  ON public.user_restaurants (user_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_user
  ON public.user_restaurants (user_id);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant
  ON public.user_restaurants (restaurant_id);

-- 3) Adiciona users.is_superadmin
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

-- 4) Backfill: copia (user, restaurant_id, role) pro user_restaurants
--    Apenas se as colunas legadas ainda existem
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'restaurant_id'
  ) THEN
    -- Migra equipe: ignora superadmin (que não tem restaurant_id)
    INSERT INTO public.user_restaurants (user_id, restaurant_id, role)
    SELECT u.id, u.restaurant_id, u.role::text::public.membership_role
    FROM public.users u
    WHERE u.restaurant_id IS NOT NULL
      AND u.role IN ('owner', 'operator', 'kitchen', 'delivery')
    ON CONFLICT (user_id, restaurant_id) DO NOTHING;

    -- Marca superadmins
    UPDATE public.users SET is_superadmin = true WHERE role = 'superadmin';
  END IF;
END $$;

-- 5) Atualiza a função current_restaurant_id para uma checagem de membership
--    Mantemos o nome por compatibilidade, mas agora ela retorna setof uuid.
-- CASCADE pra dropar policies que dependem dela; serão recriadas via pnpm db:apply-rls
DROP FUNCTION IF EXISTS public.current_restaurant_id() CASCADE;

CREATE OR REPLACE FUNCTION public.user_restaurant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.user_restaurant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_restaurant_ids() TO authenticated;

-- 6) Drop das colunas legadas em users (depois do backfill).
--    DROP de role precisa dropar default/constraints atrelados.
ALTER TABLE public.users DROP COLUMN IF EXISTS restaurant_id;
ALTER TABLE public.users DROP COLUMN IF EXISTS role;

-- 7) Verificar
--   SELECT * FROM public.user_restaurants;
--   SELECT column_name FROM information_schema.columns
--     WHERE table_schema='public' AND table_name='users';
