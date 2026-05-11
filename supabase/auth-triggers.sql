-- Sincronização auth.users → public.users + criação self-service de restaurante.
--
-- COMO RODAR: Dashboard Supabase → SQL Editor → cole tudo isso → Run.
-- É idempotente: pode rodar várias vezes sem quebrar.
--
-- Como funciona: quando alguém faz signUp() ou é convidado via admin.inviteUserByEmail(),
-- o Supabase Auth insere uma linha em auth.users. Esse trigger lê o raw_user_meta_data
-- e cria a linha correspondente em public.users, decidindo pelo campo `signup_type`:
--
--   - signup_type = 'owner': cria um restaurante novo + usuário como owner.
--     Metadata esperada: { signup_type, name, restaurant_name, restaurant_phone }
--
--   - signup_type = 'invite': cria só o usuário, vinculado ao restaurant_id do invite.
--     Metadata esperada: { signup_type, name, restaurant_id, role }
--
--   - sem signup_type: não faz nada (ex: usuário criado direto pelo dashboard do Supabase).
--     Você vai precisar criar a linha em public.users manualmente nesse caso.

-- =========================================================================
-- Helper: slugify sem depender da extensão `unaccent`.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  -- Tira acentos manualmente (cobre os comuns de pt-BR)
  result := lower(input);
  result := translate(result,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
  );
  -- Tudo que não for [a-z0-9] vira hífen
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  -- Tira hífens das pontas
  result := trim(both '-' from result);
  IF result = '' THEN
    result := 'restaurante';
  END IF;
  RETURN result;
END;
$$;

-- =========================================================================
-- Função do trigger
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signup_type text;
  user_name text;
  user_role_val public.user_role;
  rest_id uuid;
  rest_name text;
  rest_phone text;
  slug_base text;
  slug_attempt text;
  counter int := 0;
BEGIN
  signup_type := NEW.raw_user_meta_data->>'signup_type';
  user_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.email);

  IF signup_type = 'owner' THEN
    rest_name := NEW.raw_user_meta_data->>'restaurant_name';
    rest_phone := COALESCE(NULLIF(NEW.raw_user_meta_data->>'restaurant_phone', ''), '');

    IF rest_name IS NULL OR rest_name = '' THEN
      RAISE EXCEPTION 'restaurant_name é obrigatório no signup de owner';
    END IF;

    -- Gera slug único (loop incrementando counter se houver colisão)
    slug_base := public.slugify(rest_name);
    slug_attempt := slug_base;
    WHILE EXISTS (SELECT 1 FROM public.restaurants WHERE slug = slug_attempt) LOOP
      counter := counter + 1;
      slug_attempt := slug_base || '-' || counter;
    END LOOP;

    INSERT INTO public.restaurants (
      name, slug, phone, whatsapp, address, business_hours, is_active
    ) VALUES (
      rest_name,
      slug_attempt,
      rest_phone,
      rest_phone,
      jsonb_build_object(
        'street','', 'number','', 'neighborhood','',
        'city','', 'state','', 'cep',''
      ),
      jsonb_build_object(
        'mon', jsonb_build_object('open','10:00','close','22:00'),
        'tue', jsonb_build_object('open','10:00','close','22:00'),
        'wed', jsonb_build_object('open','10:00','close','22:00'),
        'thu', jsonb_build_object('open','10:00','close','22:00'),
        'fri', jsonb_build_object('open','10:00','close','22:00'),
        'sat', jsonb_build_object('open','10:00','close','22:00'),
        'sun', jsonb_build_object('open','10:00','close','22:00','closed', true)
      ),
      true
    )
    RETURNING id INTO rest_id;

    INSERT INTO public.users (id, restaurant_id, role, name, email)
    VALUES (NEW.id, rest_id, 'owner', user_name, NEW.email);

  ELSIF signup_type = 'invite' THEN
    rest_id := (NEW.raw_user_meta_data->>'restaurant_id')::uuid;
    user_role_val := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.user_role,
      'operator'::public.user_role
    );

    IF rest_id IS NULL THEN
      RAISE EXCEPTION 'restaurant_id é obrigatório no invite';
    END IF;

    INSERT INTO public.users (id, restaurant_id, role, name, email)
    VALUES (NEW.id, rest_id, user_role_val, user_name, NEW.email);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- =========================================================================
-- Trigger em auth.users
-- =========================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- Para verificar:
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;
-- =========================================================================
