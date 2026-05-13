-- Row Level Security para o Supabase do projeto NexoMenu
--
-- COMO RODAR: Dashboard Supabase -> SQL Editor -> cole tudo isso -> Run,
--             OU pnpm db:apply-rls.
-- É idempotente: pode rodar várias vezes sem quebrar.
--
-- Modelo de seguranca:
--  * O app usa Drizzle no server-side com DATABASE_URL (papel `postgres`),
--    que BYPASSA RLS. Todas as escritas passam por la.
--  * O navegador usa apenas a NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable),
--    que cai nos roles `anon` (sem login) e `authenticated` (com login).
--  * Anon: ZERO acesso. Authenticated: SELECT apenas em dados dos restaurantes
--    dos quais o usuario eh membro (via public.user_restaurants).
--    Superadmin (users.is_superadmin = true): le tudo.

-- =========================================================================
-- 1) Ativa RLS em todas as tabelas
-- =========================================================================
ALTER TABLE public.restaurants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restaurants    ENABLE ROW LEVEL SECURITY;

-- Forca o RLS tambem para o owner da tabela (defesa em profundidade).
-- O `postgres` continua bypassando por ser superuser.
ALTER TABLE public.orders              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.order_items         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customers           FORCE ROW LEVEL SECURITY;

-- =========================================================================
-- 2) Helpers
-- =========================================================================

-- Retorna o conjunto de restaurant_ids dos quais o usuario logado eh membro
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

-- Retorna true se o usuario logado eh superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.users WHERE id = auth.uid() LIMIT 1),
    false
  )
$$;

REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- =========================================================================
-- 3) Policies — somente SELECT, somente para `authenticated`,
--    e somente dados dos restaurantes onde o usuario eh membro.
--    Escritas continuam via Drizzle no server.
-- =========================================================================

-- USERS: ve apenas a si mesmo (superadmin ve todos)
DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_superadmin());

-- USER_RESTAURANTS: ve apenas as proprias memberships
DROP POLICY IF EXISTS user_restaurants_select_own ON public.user_restaurants;
CREATE POLICY user_restaurants_select_own ON public.user_restaurants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_superadmin());

-- ORDERS: ve pedidos dos restaurantes onde eh membro
DROP POLICY IF EXISTS orders_select_own_restaurant ON public.orders;
CREATE POLICY orders_select_own_restaurant ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR restaurant_id IN (SELECT public.user_restaurant_ids())
  );

-- ORDER_ITEMS: ve itens dos pedidos dos seus restaurantes
DROP POLICY IF EXISTS order_items_select_own_restaurant ON public.order_items;
CREATE POLICY order_items_select_own_restaurant ON public.order_items
  FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.restaurant_id IN (SELECT public.user_restaurant_ids())
    )
  );

-- CUSTOMERS: ve clientes dos seus restaurantes
DROP POLICY IF EXISTS customers_select_own_restaurant ON public.customers;
CREATE POLICY customers_select_own_restaurant ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR restaurant_id IN (SELECT public.user_restaurant_ids())
  );

-- (As demais tabelas — restaurants, categories, products, etc. — ficam com
--  RLS ligado mas SEM policies. Isso significa: zero acesso via anon/authenticated.
--  O menu publico (/<slug>) e renderizado server-side via Drizzle,
--  entao nao precisa de policy publica.)

-- =========================================================================
-- 4) Realtime publication — garante que orders entra no canal Realtime
-- =========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- =========================================================================
-- Pronto. Para verificar:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--   SELECT * FROM pg_policies WHERE schemaname = 'public';
-- =========================================================================
