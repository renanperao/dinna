# NexoMenu — Plano de Desenvolvimento Completo

> **Documento técnico para execução pelo Claude Code**
> Sistema de gestão e cardápio digital para restaurantes, inspirado nas funcionalidades do Cardápio Web com diferenciais exclusivos. Otimizado para o mercado brasileiro: baixa latência (região sa-east-1), métodos de pagamento locais (PIX, cartões nacionais), integração nativa com WhatsApp.

---

## 📋 Índice

1. [Visão geral](#1-visão-geral)
2. [Decisões técnicas e justificativas](#2-decisões-técnicas-e-justificativas)
3. [Arquitetura do sistema](#3-arquitetura-do-sistema)
4. [Estrutura do projeto](#4-estrutura-do-projeto)
5. [Schema do banco de dados](#5-schema-do-banco-de-dados)
6. [Fluxo de implementação por fases](#6-fluxo-de-implementação-por-fases)
7. [Variáveis de ambiente](#7-variáveis-de-ambiente)
8. [Comandos úteis](#8-comandos-úteis)
9. [Checklist de lançamento](#9-checklist-de-lançamento)
10. [Roadmap pós-MVP](#10-roadmap-pós-mvp)

---

## 1. Visão geral

### 1.1. Objetivo
Construir um sistema SaaS completo para um restaurante operar **delivery, retirada e mesas** sem depender do iFood, com:
- Cardápio digital próprio (link único e QR code)
- Painel administrativo com KDS, financeiro, CRM e relatórios
- Integração com PIX automático e cartão
- Disparo de mensagens via WhatsApp

### 1.2. Perfis de usuário
| Perfil | Acesso | O que faz |
|--------|--------|-----------|
| Cliente | Público (link/QR) | Navega cardápio, monta pedido, paga |
| Operador/Caixa | Login | Recebe pedidos, atualiza status |
| Cozinha | Login (KDS) | Vê fila de produção, marca como pronto |
| Entregador | Login (mobile) | Aceita pedidos, atualiza entrega |
| Gerente/Dono | Login (admin) | CRUD de cardápio, relatórios, configurações |

### 1.3. Critérios de sucesso técnico
- ⚡ **TTFB < 200ms** no cardápio (servido do edge sa-east-1)
- 📱 **Lighthouse Performance ≥ 90** em mobile
- 🔄 **Atualização de pedidos em tempo real** (Supabase Realtime)
- 💳 **PIX confirmado em < 3s** após pagamento
- 🌎 **100% responsivo** (mobile-first, ~70% do tráfego é mobile no Brasil)
- 🔐 **LGPD-compliant** desde o dia 1

---

## 2. Decisões técnicas e justificativas

### 2.1. Frontend — `Next.js 16 + TypeScript + Tailwind v4`

**Por que Next.js 16 e não SvelteKit/Remix?**
- ✅ Ecossistema React maduro (shadcn/ui, lucide, todas as libs de pagamento)
- ✅ Server Components reduzem JavaScript enviado ao cliente
- ✅ Server Actions eliminam a necessidade de API routes em muitos casos
- ✅ Partial Prerendering (PPR) entrega o cardápio como shell estático em < 100ms
- ✅ Vercel hospeda em região `gru1` (São Paulo) sem configuração extra
- ✅ Curva de contratação maior se você precisar escalar o time

**Stack do frontend:**
```
Next.js 16 (App Router + RSC + Server Actions)
TypeScript (strict mode)
Tailwind CSS v4 (nova engine Oxide, 70% menor)
shadcn/ui (componentes copiáveis, sem lock-in)
lucide-react (ícones)
Zustand (estado global do carrinho — leve, 1.2kb)
TanStack Query v5 (server state + cache)
React Hook Form + Zod (forms type-safe)
Framer Motion (animações do cardápio)
sonner (toasts)
```

### 2.2. Backend — `Server Actions + Route Handlers`

Não vamos criar uma API separada (Express, NestJS, etc.) por enquanto. Para um SaaS desse porte, **Server Actions do Next.js** são suficientes e eliminam uma camada de complexidade. Se no futuro precisar de um backend dedicado (multi-tenancy enterprise, mobile nativo), migra para `Hono` ou `Fastify`.

```
Server Actions (mutations: criar pedido, atualizar status)
Route Handlers (webhooks: Mercado Pago, Evolution API)
Drizzle ORM (mais leve e rápido que Prisma, type-safe)
Zod (validação em runtime)
date-fns + date-fns-tz (timezone America/Sao_Paulo)
```

**Por que Drizzle e não Prisma?**
- 🚀 Bundle size 10x menor (importante em edge functions)
- 🚀 Sem geração de client (build mais rápido)
- 🚀 SQL-like — você sabe exatamente o que está rodando
- 🚀 Migrations mais simples e versionáveis

### 2.3. Database — `Supabase (PostgreSQL na região São Paulo)`

**Por que Supabase e não Neon/PlanetScale?**

| Aspecto | Supabase | Neon | PlanetScale |
|---------|----------|------|-------------|
| Região São Paulo | ✅ sa-east-1 | ❌ (Virginia, Frankfurt) | ❌ (sem região BR) |
| Auth incluído | ✅ | ❌ | ❌ |
| Storage incluído | ✅ | ❌ | ❌ |
| Realtime | ✅ | ❌ | ❌ |
| Row Level Security | ✅ | ✅ | ❌ |
| Free tier | 500MB + 2GB transfer | 0.5GB | 5GB |
| Custo Pro | US$ 25/mês | US$ 19/mês | US$ 39/mês |

Para um restaurante o Supabase **resolve 4 problemas com 1 contratação**: banco + auth + storage de imagens + realtime do KDS.

**Configuração crítica:**
- Região: `sa-east-1` (São Paulo) — latência ~15ms vs ~120ms (us-east)
- PostgreSQL 16
- Connection pooling: PgBouncer mode `transaction`
- RLS habilitado em TODAS as tabelas

### 2.4. Pagamentos — `Mercado Pago (principal) + Asaas (fallback futuro)`

**Por que Mercado Pago como principal?**
- ✅ **Maior taxa de aprovação** no Brasil (consumidor já tem conta)
- ✅ **PIX automático nativo** — webhook em < 3s
- ✅ **Sem mensalidade** — só taxa por transação
- ✅ Cartão de crédito com antecipação automática
- ✅ Documentação razoável em português + suporte BR
- ✅ Permite **split payment** (útil se o restaurante virar marketplace)

**Taxas Mercado Pago (referência dezembro/2025):**
| Método | Taxa | Recebimento |
|--------|------|-------------|
| PIX | 0,99% | Imediato |
| Cartão de crédito (na hora) | 4,99% | 14 dias |
| Cartão de crédito (na hora, recebimento em 14d) | 4,49% | 14 dias |
| Cartão de débito | 2,99% | 1 dia útil |
| Boleto | R$ 3,49 | 2 dias úteis |

**Estratégia:**
1. **PIX como pagamento principal** — botão grande, geração de QR code dinâmico, confirmação automática via webhook
2. **Cartão de crédito** via checkout transparente do Mercado Pago (não redirecionar — quebra a UX)
3. **Dinheiro / cartão na entrega** como opções offline (sem taxa)

**Implementação:**
- SDK oficial: `mercadopago` (Node.js)
- Webhooks em `/api/webhooks/mercadopago` com validação de assinatura
- Idempotency-Key obrigatório em criação de pagamentos

### 2.5. WhatsApp — `Evolution API (self-hosted) ou Z-API (SaaS)`

**Opção A: Evolution API (recomendada para custo)**
- Open-source, self-hosted em VPS de R$ 20/mês
- Sem limite de mensagens
- Funciona com WhatsApp Web (não precisa do WhatsApp Business API oficial)
- Risco: pode ser banido pela Meta (mitigar usando aquecimento de chip)

**Opção B: Z-API (recomendada para confiabilidade)**
- Plano básico: R$ 99/mês
- API estável, sem risco de banimento
- Documentação em português
- Webhooks nativos

**Decisão:** começar com Evolution API self-hosted para o MVP. Se a operação crescer e o risco de banimento incomodar, migrar para Z-API. A API de envio de mensagens deve ser abstraída em uma camada (`lib/whatsapp.ts`) para trocar sem dor.

### 2.6. Hospedagem — `Vercel + Supabase + Cloudflare`

**Vercel** (frontend + API)
- Região `gru1` (São Paulo) — habilitar nas configurações
- Plano Hobby: gratuito até 100GB bandwidth/mês (suficiente para começar)
- Plano Pro (US$ 20/mês): quando passar de 1000 pedidos/mês

**Supabase** (banco + auth + storage)
- Região `sa-east-1`
- Free tier: 500MB DB + 1GB storage + 50k MAU
- Plano Pro (US$ 25/mês): quando passar de 500MB de banco

**Cloudflare** (CDN + DNS + proteção)
- Free tier resolve para o MVP
- Domínio próprio (.com.br via Registro.br ~R$ 40/ano)
- Proxy ativado: cache + DDoS protection

**Custo estimado total:**
| Estágio | Custo mensal |
|---------|-------------|
| MVP (até 1000 pedidos/mês) | R$ 0–50 (só domínio + Evolution VPS) |
| Crescimento (5000 pedidos/mês) | R$ 200–300 (Vercel Pro + Supabase Pro) |
| Escala (20000 pedidos/mês) | R$ 500–800 |

### 2.7. Outras ferramentas

| Necessidade | Ferramenta | Justificativa |
|-------------|-----------|---------------|
| E-mail transacional | **Resend** | DX excelente, templates em React, US$ 0–20/mês |
| Monitoramento de erros | **Sentry** | Free tier de 5k events/mês |
| Analytics de produto | **PostHog** | Self-host ou cloud, free tier generoso |
| Maps / geocoding | **Google Maps Platform** | US$ 200/mês de crédito grátis |
| Filas / jobs | **Trigger.dev** ou **Inngest** | Para envio de WhatsApp em massa |
| Testes E2E | **Playwright** | Padrão de mercado |
| Testes unitários | **Vitest** | Mais rápido que Jest |

---

## 3. Arquitetura do sistema

### 3.1. Diagrama de alto nível

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENTE FINAL                          │
│  Mobile/Desktop → Cardápio Digital (link único + QR code)   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  HTTPS │ (Cloudflare CDN)
                           │
┌─────────────────────────────────────────────────────────────┐
│              VERCEL EDGE (gru1 — São Paulo)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js 16 App                                       │   │
│  │  ├─ /(public)/[slug]   → cardápio do restaurante     │   │
│  │  ├─ /(public)/checkout → finalização do pedido       │   │
│  │  ├─ /(admin)/*         → painel admin (auth)         │   │
│  │  ├─ /(kds)/*           → tela de cozinha (auth)      │   │
│  │  └─ /api/webhooks/*    → Mercado Pago, Evolution     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────┬───────────────────────────┬──────────────────┘
               │                           │
       SQL │ (TLS, sa-east-1)        │ HTTPS
               │                           │
┌──────────────────────────┐   ┌─────────────────────────────┐
│  SUPABASE (sa-east-1)     │   │  SERVIÇOS EXTERNOS          │
│  ├─ PostgreSQL 16         │   │  ├─ Mercado Pago (PIX/cc)   │
│  ├─ Auth (RLS)            │   │  ├─ Evolution API (WhatsApp)│
│  ├─ Storage (imagens)     │   │  ├─ Resend (e-mail)         │
│  └─ Realtime (KDS)        │   │  └─ Google Maps (geocode)   │
└───────────────────────────┘   └─────────────────────────────┘
```

### 3.2. Multi-tenancy

Cada restaurante é um **tenant** identificado por `restaurant_id` (UUID). Estratégia:
- Schema único, todas as tabelas têm `restaurant_id NOT NULL`
- Row Level Security (RLS) garante isolamento no banco
- URL do cardápio: `nexomenu.com.br/{slug}` (ex: `nexomenu.com.br/dom-pedro`)
- Domínio próprio futuro: `cardapio.dompedro.com.br` (CNAME → Vercel)

### 3.3. Fluxo de um pedido (do clique ao forno)

```
1. Cliente abre /dom-pedro                              [edge cache]
2. Adiciona pizza ao carrinho                           [Zustand local]
3. Vai para checkout, escolhe PIX                       [Server Action]
4. Server cria pedido no Postgres (status: aguardando_pagamento)
5. Server chama Mercado Pago API → recebe QR code PIX
6. Cliente paga no app do banco
7. Mercado Pago dispara webhook → /api/webhooks/mercadopago
8. Webhook atualiza status para "pago" e dispara:
   - Notificação realtime para o KDS (Supabase Realtime)
   - WhatsApp para o cliente (Evolution API)
   - E-mail de confirmação (Resend)
9. Cozinha vê o pedido no KDS, marca "em produção" → "pronto"
10. Entregador aceita o pedido no app, status → "saiu para entrega"
11. Entrega confirmada, status → "entregue", pesquisa NPS via WhatsApp
```

---

## 4. Estrutura do projeto

```
nexomenu/
├── .env.local                        # variáveis (não commitar)
├── .env.example                      # template
├── .gitignore
├── README.md
├── package.json
├── pnpm-lock.yaml
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── drizzle.config.ts
├── playwright.config.ts
│
├── public/
│   ├── favicon.ico
│   ├── og-default.png
│   └── icons/                       # PWA icons
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                # root layout
│   │   ├── globals.css
│   │   ├── (public)/
│   │   │   ├── layout.tsx
│   │   │   ├── [slug]/
│   │   │   │   ├── page.tsx          # cardápio
│   │   │   │   ├── checkout/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── pedido/
│   │   │   │       └── [orderId]/
│   │   │   │           └── page.tsx  # tracking
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (admin)/
│   │   │   ├── layout.tsx            # auth check
│   │   │   ├── dashboard/
│   │   │   ├── pedidos/
│   │   │   ├── cardapio/
│   │   │   ├── clientes/
│   │   │   ├── promocoes/
│   │   │   ├── entregadores/
│   │   │   ├── relatorios/
│   │   │   └── configuracoes/
│   │   │
│   │   ├── (kds)/
│   │   │   └── cozinha/
│   │   │       └── page.tsx          # tela KDS fullscreen
│   │   │
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   ├── mercadopago/
│   │   │   │   │   └── route.ts
│   │   │   │   └── evolution/
│   │   │   │       └── route.ts
│   │   │   └── cron/
│   │   │       └── send-promotions/
│   │   │           └── route.ts
│   │   │
│   │   └── opengraph-image.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn components
│   │   ├── menu/
│   │   │   ├── product-card.tsx
│   │   │   ├── product-modal.tsx
│   │   │   ├── pizza-builder.tsx     # meio a meio
│   │   │   └── category-nav.tsx
│   │   ├── cart/
│   │   │   ├── cart-drawer.tsx
│   │   │   └── cart-item.tsx
│   │   ├── checkout/
│   │   │   ├── address-form.tsx
│   │   │   ├── payment-selector.tsx
│   │   │   └── pix-modal.tsx
│   │   ├── kds/
│   │   │   ├── order-card.tsx
│   │   │   └── kds-board.tsx
│   │   └── admin/
│   │       ├── stats-card.tsx
│   │       ├── orders-table.tsx
│   │       └── menu-form.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts              # Drizzle client
│   │   │   ├── schema.ts             # todas as tabelas
│   │   │   └── migrations/
│   │   ├── supabase/
│   │   │   ├── client.ts             # browser
│   │   │   ├── server.ts             # server components
│   │   │   └── middleware.ts
│   │   ├── mercadopago/
│   │   │   ├── client.ts
│   │   │   ├── pix.ts
│   │   │   ├── card.ts
│   │   │   └── webhook.ts
│   │   ├── whatsapp/
│   │   │   ├── client.ts             # Evolution API wrapper
│   │   │   └── templates.ts          # mensagens prontas
│   │   ├── email/
│   │   │   ├── client.ts             # Resend
│   │   │   └── templates/            # React Email
│   │   ├── auth.ts
│   │   ├── pricing.ts                # cálculos de preço (meia/meia, etc)
│   │   ├── delivery.ts               # cálculo de taxa por bairro/km
│   │   └── utils.ts
│   │
│   ├── stores/
│   │   ├── cart-store.ts             # Zustand
│   │   └── ui-store.ts
│   │
│   ├── actions/                      # Server Actions
│   │   ├── orders.ts
│   │   ├── menu.ts
│   │   ├── customers.ts
│   │   └── reports.ts
│   │
│   ├── types/
│   │   ├── order.ts
│   │   ├── product.ts
│   │   └── restaurant.ts
│   │
│   └── middleware.ts                 # auth + tenant resolution
│
├── tests/
│   ├── e2e/
│   │   ├── customer-flow.spec.ts
│   │   └── admin-flow.spec.ts
│   └── unit/
│       └── pricing.test.ts
│
└── docs/
    ├── api.md
    └── deploy.md
```

---

## 5. Schema do banco de dados

### 5.1. Tabelas principais

```sql
-- =====================
-- TENANTS / RESTAURANTES
-- =====================
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,                    -- 'dom-pedro'
  name TEXT NOT NULL,
  logo_url TEXT,
  cover_url TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  address JSONB NOT NULL,                       -- {street, number, neighborhood, city, state, cep, lat, lng}
  business_hours JSONB NOT NULL,                -- {mon: {open: '18:00', close: '23:30'}, ...}
  delivery_zones JSONB,                         -- [{neighborhood: 'Centro', fee: 5.00, max_minutes: 40}]
  delivery_radius_km NUMERIC(4,1),              -- alternativa ao zones
  delivery_fee_per_km NUMERIC(6,2),
  min_order_value NUMERIC(8,2) DEFAULT 0,
  pix_key TEXT,
  mercadopago_access_token TEXT,                -- encrypted
  evolution_instance TEXT,
  primary_color TEXT DEFAULT '#C41E3A',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- USUÁRIOS (operadores, gerentes, entregadores)
-- =====================
CREATE TABLE users (
  id UUID PRIMARY KEY,                          -- mesmo ID do auth.users do Supabase
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','operator','kitchen','delivery')),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CARDÁPIO
-- =====================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                           -- 'Pizzas Tradicionais', 'Bebidas'
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  available_hours JSONB,                        -- restrição opcional
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('pizza','beverage','side','dessert','combo','other')),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price NUMERIC(8,2),                      -- usado quando NÃO há sizes (ex: bebida)
  is_available BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  tags TEXT[],                                   -- ['vegan', 'gluten-free', 'spicy']
  display_order INT DEFAULT 0,
  ingredients TEXT[],                            -- para meia/meia mostrar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tamanhos (P, M, G, GG) com preços individuais — só para pizzas
CREATE TABLE product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                           -- 'P', 'M', 'G', 'Família'
  diameter_cm INT,
  slices INT,
  max_flavors INT DEFAULT 1,                    -- 1=inteira, 2=meia, 4=quatro sabores
  price NUMERIC(8,2) NOT NULL,
  display_order INT DEFAULT 0
);

-- Bordas, massas, adicionais
CREATE TABLE product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,                     -- 'Borda', 'Massa', 'Adicional'
  name TEXT NOT NULL,                           -- 'Catupiry', 'Integral', 'Extra queijo'
  price_delta NUMERIC(8,2) DEFAULT 0,           -- pode ser por tamanho via JSON
  price_by_size JSONB,                          -- {P: 0, M: 5, G: 8, GG: 10}
  is_required BOOLEAN DEFAULT FALSE,
  max_selections INT DEFAULT 1,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- =====================
-- CLIENTES
-- =====================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,                          -- WhatsApp como ID
  name TEXT,
  email TEXT,
  birthday DATE,
  loyalty_points INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  avg_ticket NUMERIC(8,2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  tags TEXT[],                                   -- ['vip', 'frequente']
  is_blocked BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, phone)
);

CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT,                                   -- 'Casa', 'Trabalho'
  cep TEXT,
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  reference TEXT,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- PEDIDOS
-- =====================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  number SERIAL,                                -- número humano #001, #002
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,                 -- redundante para histórico
  customer_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('delivery','pickup','dine_in')),
  table_number INT,                             -- se dine_in
  status TEXT NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment','received','preparing','ready','out_for_delivery','delivered','cancelled')),
  scheduled_for TIMESTAMPTZ,                    -- pedido agendado
  
  -- valores
  subtotal NUMERIC(10,2) NOT NULL,
  delivery_fee NUMERIC(8,2) DEFAULT 0,
  discount NUMERIC(8,2) DEFAULT 0,
  coupon_code TEXT,
  total NUMERIC(10,2) NOT NULL,
  
  -- entrega
  delivery_address JSONB,                       -- snapshot do endereço
  delivery_distance_km NUMERIC(5,2),
  delivery_minutes_estimate INT,
  delivery_user_id UUID REFERENCES users(id),
  
  -- pagamento
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix','credit','debit','cash','meal_voucher','on_delivery_card','on_delivery_cash','fiado')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','failed')),
  payment_provider_id TEXT,                     -- ID no Mercado Pago
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  change_for NUMERIC(8,2),                      -- troco para
  
  -- observações
  notes TEXT,                                   -- observações gerais do pedido
  source TEXT DEFAULT 'website',                -- 'website', 'whatsapp', 'pos', 'ifood'
  
  -- timestamps de cada etapa (para relatório)
  received_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens do pedido (snapshot — não FK para products porque produto pode mudar de preço)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID,                              -- referência informativa, sem FK
  product_name TEXT NOT NULL,
  product_type TEXT,
  size_name TEXT,
  flavors JSONB,                                -- [{name: 'Margherita', percentage: 50}, {...}]
  options JSONB,                                -- [{group: 'Borda', name: 'Catupiry', price: 8}]
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(8,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  notes TEXT
);

-- =====================
-- CUPONS / PROMOÇÕES
-- =====================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed','free_delivery')),
  discount_value NUMERIC(8,2) NOT NULL,
  min_order_value NUMERIC(8,2),
  max_uses INT,
  uses_count INT DEFAULT 0,
  max_uses_per_customer INT DEFAULT 1,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  applicable_to JSONB,                          -- {category_ids: [], product_ids: [], days_of_week: [1,2,3]}
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(restaurant_id, code)
);

-- =====================
-- ESTOQUE / FICHA TÉCNICA
-- =====================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                           -- 'Mussarela', 'Tomate'
  unit TEXT NOT NULL,                           -- 'kg', 'g', 'un', 'ml'
  current_stock NUMERIC(10,3) DEFAULT 0,
  min_stock NUMERIC(10,3),
  cost_per_unit NUMERIC(8,4),                   -- 4 decimais para precisão
  supplier TEXT,
  last_purchase_at TIMESTAMPTZ
);

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_size_id UUID REFERENCES product_sizes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  quantity NUMERIC(10,3) NOT NULL
);

-- =====================
-- AVALIAÇÕES / NPS
-- =====================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- LOG / AUDITORIA
-- =====================
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- =====================
-- ÍNDICES (performance)
-- =====================
CREATE INDEX idx_products_restaurant ON products(restaurant_id) WHERE is_available = TRUE;
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status, created_at DESC);
CREATE INDEX idx_orders_customer ON orders(customer_id, created_at DESC);
CREATE INDEX idx_customers_phone ON customers(restaurant_id, phone);
CREATE INDEX idx_categories_active ON categories(restaurant_id, display_order) WHERE is_active = TRUE;

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... (todas as tabelas)

-- Política: cardápio público pode ser lido por qualquer um
CREATE POLICY "Public can read active products"
  ON products FOR SELECT
  USING (is_available = TRUE);

-- Política: usuários só veem dados do próprio restaurante
CREATE POLICY "Users see only their restaurant"
  ON orders FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## 6. Fluxo de implementação por fases

### 🏗️ Fase 0 — Setup do projeto (Dia 1)

**Objetivo:** projeto rodando localmente com banco conectado.

1. Criar repo GitHub `nexomenu`
2. `pnpm create next-app@latest --typescript --tailwind --app --turbopack`
3. Instalar dependências core:
   ```bash
   pnpm add drizzle-orm postgres @supabase/supabase-js @supabase/ssr
   pnpm add zod react-hook-form @hookform/resolvers
   pnpm add zustand @tanstack/react-query
   pnpm add date-fns date-fns-tz
   pnpm add framer-motion sonner
   pnpm add mercadopago resend
   pnpm add -D drizzle-kit @types/node
   ```
4. Configurar shadcn: `pnpm dlx shadcn@latest init`
5. Criar projeto no Supabase (região São Paulo)
6. Rodar migrations iniciais: `pnpm drizzle-kit push`
7. Criar seed com 1 restaurante de teste (`restaurante-demo`) e 10 pizzas

**Critério de aceite:** `localhost:3000/restaurante-demo` mostra os produtos do banco.

---

### 🍕 Fase 1 — Cardápio digital público (Dias 2-4)

**Objetivo:** o cliente consegue ver o cardápio bonito e funcional, mas ainda sem checkout.

**Telas:**
- `/[slug]` — header com logo, info, busca, lista de produtos por categoria
- Modal de produto: para pizza, exibir tamanhos e bordas; para outros, simples + qtd
- Componente `<PizzaBuilder />` para meia/meia (até 2 sabores)

**Componentes-chave:**
- `<Header />` — logo, "abre às 18h", status (aberto/fechado)
- `<CategoryNav />` — scroll horizontal sticky no topo
- `<ProductCard />` — foto, nome, descrição curta, preço a partir de
- `<ProductModal />` — escolha de tamanho, borda, observação, qtd
- `<CartFAB />` — botão flutuante "ver carrinho (3 itens · R$ 89,90)"

**Lógica:**
- `lib/pricing.ts`: cálculo de preço da pizza (regra: maior preço entre os sabores)
- `stores/cart-store.ts`: Zustand para o carrinho com persistência em sessionStorage

**Critério de aceite:**
- Cliente abre o link → escolhe pizza Calabresa (M) com borda Catupiry → adiciona ao carrinho → o preço bate
- Lighthouse Performance ≥ 90 em mobile
- Cardápio carrega em < 1s no 4G simulado

---

### 🛒 Fase 2 — Carrinho e checkout (Dias 5-7)

**Objetivo:** cliente consegue finalizar o pedido, mas sem pagamento (escolhe "dinheiro na entrega" por enquanto).

**Telas:**
- `<CartDrawer />` — drawer lateral com itens editáveis
- `/[slug]/checkout` — formulário de dados + endereço + pagamento + revisão

**Funcionalidades:**
- Identificação do cliente por WhatsApp (auto-preenche se já pediu antes)
- CEP via API ViaCEP → preenche endereço
- Cálculo da taxa de entrega por bairro/distância
- Validação do mínimo do pedido
- Aplicação de cupom de desconto
- Server Action `createOrder()` que:
  1. Valida tudo com Zod
  2. Insere pedido + items no banco em transação
  3. Cria/atualiza customer
  4. Retorna o ID do pedido

**Critério de aceite:**
- Cliente preenche checkout → pedido aparece no banco com status `received`
- WhatsApp do cliente recebe mensagem de confirmação (mockada por enquanto)

---

### 💳 Fase 3 — Pagamentos (PIX e cartão) (Dias 8-10)

**Objetivo:** cliente paga PIX ou cartão e o pedido é confirmado automaticamente.

**Implementação:**

1. **PIX automático**
   - Server Action chama `mercadopago.payment.create()` com `payment_method_id: 'pix'`
   - Recebe QR code e copy-paste
   - Cliente vê modal com QR code + botão "copiar código"
   - Polling a cada 3s para verificar status (ou usa Supabase Realtime após webhook)
   - Quando webhook do MP avisa "approved", atualiza pedido e dispara notificações

2. **Cartão de crédito (checkout transparente)**
   - SDK frontend do Mercado Pago tokeniza o cartão (não passa pelo nosso servidor)
   - Token + dados do pedido vão para Server Action
   - `mercadopago.payment.create()` com o token
   - Resposta imediata (aprovado / rejeitado / pendente)

3. **Webhook handler** em `/api/webhooks/mercadopago/route.ts`
   - Validar `x-signature` header (HMAC SHA256)
   - Buscar pagamento via API e cruzar com `external_reference`
   - Atualizar `payment_status` e `status` do pedido
   - Disparar Realtime + WhatsApp + e-mail

**Atenção:**
- Usar `Idempotency-Key` (UUID por tentativa) para não criar pagamentos duplicados
- Logar todos os webhooks recebidos em uma tabela `webhook_events` para debug
- Em desenvolvimento, expor webhook via `ngrok` ou `cloudflared tunnel`

**Critério de aceite:**
- Pedido com PIX é confirmado automaticamente em < 5s após pagamento real (sandbox)
- Cartão de crédito teste do MP funciona em produção

---

### 👨‍🍳 Fase 4 — KDS (Kitchen Display System) (Dias 11-12)

**Objetivo:** a cozinha vê os pedidos em tempo real e atualiza status.

**Tela `/cozinha`:**
- Layout fullscreen otimizado para tablet/TV
- 4 colunas: `Novo` | `Em produção` | `Pronto` | `Saiu/entregue (últimos 30min)`
- Cards de pedido grandes com:
  - Número do pedido (#042)
  - Tipo (delivery/balcão/mesa N)
  - Itens com tamanho, sabor, borda destacados
  - Tempo decorrido (vermelho se > 20min)
  - Botão grande para avançar status
- Som de notificação quando entra novo pedido
- Filtro por categoria de produto (pizza vs bebida)

**Tecnologia:**
- Supabase Realtime: subscribe em `orders` filtrado por `restaurant_id`
- Atualização otimista: clica no botão → muda local → confirma com server

**+ Diferencial Plus:** Painel "produção por sabor" — agrupa quantas Margheritas, Calabresas estão em fila.

---

### 📊 Fase 5 — Painel admin (Dias 13-16)

**Telas:**

1. **`/admin/dashboard`**
   - Cards: pedidos hoje, faturamento hoje, ticket médio, em aberto
   - Gráfico de pedidos por hora (últimas 24h)
   - Top 5 produtos do mês
   - Lista de últimos 10 pedidos

2. **`/admin/pedidos`**
   - Tabela com filtros (status, data, tipo, cliente)
   - Drill-down: clica → ve detalhes + histórico de status
   - Botões: cancelar, reembolsar, reenviar WhatsApp

3. **`/admin/cardapio`**
   - CRUD de categorias, produtos, tamanhos, bordas
   - Upload de imagens (Supabase Storage)
   - Toggle "disponível agora" rápido
   - Drag-and-drop para reordenar

4. **`/admin/clientes`**
   - Lista com filtros (frequência, último pedido, ticket médio)
   - Perfil do cliente: histórico, endereços, pontos, observações
   - Disparo de WhatsApp individual

5. **`/admin/promocoes`**
   - CRUD de cupons
   - Promoção programada (toda terça 20% off em pizzas X)
   - Disparador WhatsApp em massa com preview

6. **`/admin/relatorios`**
   - Vendas por período (export CSV/PDF)
   - Curva ABC de produtos
   - Análise de horário de pico
   - Mapa de calor de delivery (Google Maps com pontos dos pedidos)

7. **`/admin/configuracoes`**
   - Dados do restaurante
   - Horário de funcionamento
   - Zonas de entrega (drag no mapa)
   - Métodos de pagamento ativos
   - Integrações (Mercado Pago, Evolution API)

---

### 📱 Fase 6 — WhatsApp e automações (Dias 17-19)

**Objetivo:** comunicação automática com clientes.

**Mensagens automáticas:**
- Pedido recebido: "Oi João! Recebemos seu pedido #042 e estamos preparando 🍕"
- Pedido pronto / saiu: "Seu pedido saiu pra entrega! Chega em ~25min"
- Pedido entregue + NPS: "Como foi seu pedido? Avalie de 1 a 5 ⭐"
- Aniversário: "Parabéns, João! Use o cupom ANIVER15 e ganhe 15% off hoje"
- Inativo (15 dias): "Faz tempo... que tal uma pizza? Aqui um cupom: SAUDADE10"

**Implementação:**
- Wrapper `lib/whatsapp/client.ts` que abstrai Evolution API
- Templates em `lib/whatsapp/templates.ts` com variáveis interpoláveis
- Cron job (Vercel Cron) para disparos diários: aniversários, inativos
- Server Action `sendBulkMessage()` para promoções manuais (com rate limit para não banir)

**Cuidados:**
- Throttle de 1 msg / 5s para evitar banimento
- Opt-out: cliente pode responder "PARAR" → marca `marketing_opt_out=true`
- Logar todas as mensagens enviadas em `whatsapp_messages` para auditoria

---

### 🚀 Fase 7 — Deploy, testes e go-live (Dias 20-21)

**Checklist técnico:**
- [ ] Deploy na Vercel (região `gru1`)
- [ ] Variáveis de ambiente configuradas em production
- [ ] Domínio próprio apontado (DNS + SSL)
- [ ] Webhooks do Mercado Pago apontando para produção
- [ ] Backups automáticos do Supabase (Pro plan)
- [ ] Sentry DSN configurado
- [ ] PostHog rodando

**Checklist de produto:**
- [ ] Logo e cores do restaurante customizadas
- [ ] Cardápio real cadastrado (com fotos profissionais!)
- [ ] Zonas de entrega mapeadas no Google Maps
- [ ] Conta Mercado Pago verificada e KYC aprovado
- [ ] WhatsApp Business com número dedicado
- [ ] Treinamento da equipe (15min de tutorial em vídeo)

**Testes finais:**
- [ ] Pedido completo PIX em produção (você mesmo paga)
- [ ] Pedido cancelado → reembolso funciona
- [ ] KDS atualiza em < 2s entre celulares diferentes
- [ ] Mobile (iOS Safari + Chrome Android) sem bugs
- [ ] Bateria de testes E2E com Playwright

---

## 7. Variáveis de ambiente

```env
# .env.local

# Database
DATABASE_URL=postgresql://postgres:senha@db.xxx.supabase.co:5432/postgres
DATABASE_URL_POOLED=postgresql://postgres:senha@db.xxx.supabase.co:6543/postgres?pgbouncer=true

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_WEBHOOK_SECRET=xxx
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx

# Evolution API
EVOLUTION_API_URL=https://evo.seudominio.com.br
EVOLUTION_API_KEY=xxx
EVOLUTION_INSTANCE_NAME=restaurante-demo

# Resend
RESEND_API_KEY=re_xxx
EMAIL_FROM="Restaurante Demo <pedidos@restaurantedemo.com.br>"

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# App
NEXT_PUBLIC_APP_URL=https://nexomenu.com.br
NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG=restaurante-demo

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Cron (proteção)
CRON_SECRET=xxx
```

---

## 8. Comandos úteis

```bash
# desenvolvimento
pnpm dev                              # next dev na 3000
pnpm db:studio                        # abre Drizzle Studio (GUI)
pnpm db:push                          # aplica schema no banco
pnpm db:generate                      # gera migration SQL
pnpm db:seed                          # popula banco com dados de teste

# qualidade
pnpm lint                             # ESLint
pnpm typecheck                        # tsc --noEmit
pnpm test                             # Vitest
pnpm test:e2e                         # Playwright

# deploy
pnpm build                            # build de produção (testar antes de deploy)
vercel                                # deploy preview
vercel --prod                         # deploy produção

# tunnel para webhooks em dev
cloudflared tunnel --url http://localhost:3000
```

---

## 9. Checklist de lançamento

### Antes de mostrar pro dono do restaurante
- [ ] Cardápio completo cadastrado com fotos
- [ ] Conta Mercado Pago do dono integrada
- [ ] WhatsApp Business configurado
- [ ] Pedido teste PIX completo (você paga R$ 0,01)
- [ ] KDS funcionando em tablet de cozinha
- [ ] Treinamento gravado em vídeo (5 min)

### Antes de divulgar pros clientes
- [ ] Domínio próprio (.com.br)
- [ ] Política de privacidade (LGPD)
- [ ] Termos de uso
- [ ] WhatsApp anti-banimento configurado
- [ ] Cardápio testado em iPhone, Android, tablet
- [ ] Backup automático ativo

### Pós-lançamento (primeira semana)
- [ ] Acompanhar Sentry para erros
- [ ] PostHog: analisar onde clientes desistem
- [ ] Coletar feedback da equipe do restaurante
- [ ] Ajustar tempo médio de preparo
- [ ] Configurar alerta de pedido > 60min sem atualização

---

## 10. Roadmap pós-MVP

### V2 (mês 2-3)
- App de entregador (PWA com geolocalização)
- Programa de fidelidade com pontos resgatáveis
- Clube de assinatura (pizza toda semana)
- Integração com iFood (receber pedidos)
- Emissão de NFC-e

### V3 (mês 4-6)
- Multi-loja (franquias)
- IA para sugestão de combos baseado no histórico
- Chatbot WhatsApp com IA (montar pedido pelo chat)
- Painel financeiro completo (DRE, fluxo de caixa, contas a pagar)
- Mapa de calor de delivery
- BI / dashboard executivo

### V4 (mês 7-12)
- Marketplace (vários restaurantes na plataforma — viraria competidor do iFood)
- App nativo (React Native)
- TEF integrado (maquininhas Cielo, Stone)
- Integração com balanças
- Auditoria de fraude com IA

---

## 📝 Notas finais para o Claude Code

1. **Comece pequeno e itere.** Não tente fazer tudo na Fase 1. Prefere algo feio funcionando a algo lindo quebrado.
2. **Server Components > Client Components.** Só use `'use client'` quando precisar de interatividade (cart, modal, form).
3. **Type-safety end-to-end.** Drizzle infere os types das tabelas → reutilize em Server Actions, forms (com Zod) e componentes.
4. **Mobile-first sempre.** No Brasil, ~70% do tráfego é mobile. Teste em iPhone real e Android low-end (Moto G).
5. **Timezone é América/Sao_Paulo.** Sempre. Configure no Postgres, no Next, e use `date-fns-tz` para formatação.
6. **Performance no cardápio é crítica.** Cliente com fome não espera. Otimize imagens (next/image + WebP), use `loading="eager"` apenas no above-the-fold, prefetch rotas.
7. **Idempotency em pagamentos.** Sempre. Sempre. Sempre.
8. **Logging estruturado.** `console.log({ event, data, ts })` para parsear no Vercel ou Sentry.
9. **Não exponha secrets no client.** Tudo que começa com `NEXT_PUBLIC_` é público — cuidado.
10. **LGPD desde o dia 1.** Cookie banner, política de privacidade, opt-in para marketing.

---

**Bom desenvolvimento! 🍕🚀**
