# 🔌 NexoMenu — Camada de Integrações (Marketplaces)

> **Documento complementar** ao `NEXOMENU_DEV_PLAN.md`. Resolve a integração com iFood, Pedidos10 e qualquer marketplace via padrão **Open Delivery** + **Adapter Pattern**. Leia depois do plano principal.

---

## 📋 Índice

1. [Por que esta camada existe](#1-por-que-esta-camada-existe)
2. [Mapeamento das APIs (iFood vs Pedidos10)](#2-mapeamento-das-apis)
3. [Mudanças no schema do banco](#3-mudanças-no-schema-do-banco)
4. [Arquitetura: Adapter Pattern + ACL](#4-arquitetura-adapter-pattern--acl)
5. [Worker dedicado (não pode ser Vercel serverless)](#5-worker-dedicado)
6. [Implementação iFood passo a passo](#6-implementação-ifood-passo-a-passo)
7. [Implementação Pedidos10 passo a passo](#7-implementação-pedidos10-passo-a-passo)
8. [Sincronização de cardápio](#8-sincronização-de-cardápio)
9. [Conciliação financeira](#9-conciliação-financeira)
10. [Homologação iFood (processo)](#10-homologação-ifood-processo)
11. [Fase nova no roadmap: Fase 8](#11-fase-nova-no-roadmap-fase-8)

---

## 1. Por que esta camada existe

Sem ela, o NexoMenu seria um cardápio digital próprio — mas o iFood ainda gera **40-60% do volume** da maioria dos restaurantes brasileiros. Ignorar isso é cortar o pé direito do dono.

**O objetivo:** todos os pedidos (próprio + iFood + Pedidos10 + futuros marketplaces) chegam no **mesmo KDS**, no **mesmo dashboard**, no **mesmo relatório**. Para a equipe do restaurante, é tudo igual. A diferença fica abstraída no backend.

**Princípio arquitetural:** *Anti-Corruption Layer* (DDD). Nenhum modelo do iFood vaza para o domínio interno. Tradução acontece nas bordas.

```
[iFood API]      ──┐
[Pedidos10 API]  ──┼──→ [Adapter] ──→ [Domínio interno: Order] ──→ [KDS, DB, etc]
[Cardápio Web]   ──┘
```

---

## 2. Mapeamento das APIs

### 2.1. iFood — Merchant API

**Base:** `https://merchant-api.ifood.com.br`
**Auth:** OAuth 2.0 Client Credentials (clientId + clientSecret → access_token, expira em 6h)
**Documentação:** https://developer.ifood.com.br

**Módulos que vamos usar:**

| Módulo | Para quê | Endpoint principal |
|--------|----------|-------------------|
| **Authentication** | Obter access_token | `POST /authentication/v1.0/oauth/token` |
| **Merchant** | Status loja, abrir/fechar, interrupções | `/merchant/v1.0/merchants/{id}/status` |
| **Catalog** | Sincronizar cardápio | `/catalog/v2.0/merchants/{id}/catalogs` |
| **Order** | Detalhes do pedido | `/order/v1.0/orders/{id}` |
| **Events** | Novos pedidos (polling OU webhook) | `/events/v1.0/events:polling` ou webhook |
| **API Sales** | Conciliação de vendas | `/financial/v3.0/merchants/{id}/sales` |
| **Financial Events** | Eventos financeiros granulares | `/financial/v3.0/merchants/{id}/financialEvents` |

**Dois modos de receber pedidos:**

| | Polling | Webhook |
|---|---------|---------|
| Quem inicia | Você | iFood |
| Frequência | A cada 30s (obrigatório) | Real-time |
| Funciona em Vercel? | ❌ não (timeout) | ✅ sim (HTTP endpoint) |
| Garantia de entrega | ✅ pode reler eventos | ❌ sem ack — pode perder |
| Heartbeat? | implícito (cada polling = heartbeat) | explícito (KEEPALIVE request) |
| Recomendação | Use polling como **fallback** | Use webhook como **principal** |

**Decisão:** Webhook como principal + polling a cada 5min como fallback (recupera eventos perdidos). Isso significa que precisamos de um worker para o polling (Vercel não serve).

**Estados de pedido (códigos do iFood):**
- `PLC` (PLACED) — novo pedido, precisa aceitar
- `CFM` (CONFIRMED) — confirmado pela loja
- `RPR` (READY_FOR_PICKUP) / `DSP` (DISPATCHED) — pronto / saiu
- `CON` (CONCLUDED) — entregue
- `CAN` (CANCELLED) — cancelado

### 2.2. Pedidos10 — Modelo de Polling

**Base:** `https://developer.pedidos10.com.br`
**Modelo:** Pedidos10 chama a SUA API (você expõe endpoints, eles consultam).

**Endpoints que VOCÊ precisa expor:**
- `GET /api/integrations/pedidos10/events` — lista eventos novos (polling deles)
- `GET /api/integrations/pedidos10/orders/{id}` — detalhes do pedido
- `POST /api/integrations/pedidos10/orders/{id}/ack` — confirmar recebimento
- `POST /api/integrations/pedidos10/orders/{id}/status` — atualizar status

Pedidos10 segue um padrão similar ao **Open Delivery** (especificação aberta da indústria, adotada por Foody Delivery, Goomer, etc.). Implementar Open Delivery resolve Pedidos10 + outros hubs de uma vez.

### 2.3. Open Delivery (padrão recomendado)

Especificação aberta: https://abrasel.com.br/open-delivery
- Padroniza payloads de pedido entre marketplaces e PDVs
- Adotado por: Foody, Goomer, Anota AI, vários hubs regionais
- Implementar isso = ganhar várias integrações de graça

---

## 3. Mudanças no schema do banco

### 3.1. Novas tabelas

```sql
-- =====================
-- INTEGRAÇÕES (credenciais por loja)
-- =====================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('ifood','pedidos10','goomer','foody','anota_ai')),
  
  -- credenciais (criptografadas com pgsodium ou KMS externo)
  credentials JSONB NOT NULL,                   -- {clientId, clientSecret, merchantId, ...}
  
  -- estado
  is_active BOOLEAN DEFAULT FALSE,
  is_authenticated BOOLEAN DEFAULT FALSE,
  last_token_refresh_at TIMESTAMPTZ,
  access_token_encrypted TEXT,                  -- token atual cacheado (expira em 6h no iFood)
  access_token_expires_at TIMESTAMPTZ,
  
  -- saúde da conexão
  last_polling_at TIMESTAMPTZ,
  last_webhook_at TIMESTAMPTZ,
  last_error TEXT,
  consecutive_errors INT DEFAULT 0,
  
  -- configuração
  webhook_secret TEXT,                          -- para validar assinatura
  config JSONB,                                 -- {operation_mode: 'marketplace'|'fullservices', polling_enabled: true}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, provider)
);

-- =====================
-- LOG DE EVENTOS (audit + dedup + retry)
-- =====================
CREATE TABLE integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  
  -- identidade do evento (para dedup)
  external_event_id TEXT NOT NULL,              -- ID que o marketplace mandou
  event_code TEXT NOT NULL,                     -- 'PLC', 'CFM', 'KEEPALIVE', etc.
  
  -- referência cruzada
  external_order_id TEXT,                       -- ID do pedido no marketplace
  internal_order_id UUID REFERENCES orders(id), -- depois que foi processado
  
  -- payload completo (debug)
  raw_payload JSONB NOT NULL,
  
  -- processamento
  source TEXT NOT NULL CHECK (source IN ('webhook','polling','manual')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','processed','failed','ignored')),
  attempts INT DEFAULT 0,
  last_error TEXT,
  
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  UNIQUE(integration_id, external_event_id)     -- garante dedup
);

CREATE INDEX idx_integration_events_pending 
  ON integration_events(integration_id, status, received_at)
  WHERE status IN ('pending','failed');

-- =====================
-- MAPEAMENTO DE PRODUTOS (cardápio interno ↔ cardápio do marketplace)
-- =====================
CREATE TABLE product_external_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_size_id UUID REFERENCES product_sizes(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  
  external_id TEXT NOT NULL,                    -- ID no iFood / Pedidos10
  external_sku TEXT,
  
  -- pode ter preço diferente no marketplace (para compensar comissão)
  external_price NUMERIC(8,2),
  
  is_synced BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  
  UNIQUE(integration_id, external_id)
);

-- =====================
-- CONCILIAÇÃO FINANCEIRA
-- =====================
CREATE TABLE financial_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  external_order_id TEXT,
  
  -- valores
  gross_value NUMERIC(10,2),                    -- total bruto da venda
  marketplace_fee NUMERIC(10,2),                -- comissão do marketplace
  payment_fee NUMERIC(10,2),                    -- taxa de pagamento (se houver)
  delivery_subsidy NUMERIC(10,2),               -- subsídio de entrega (iFood paga)
  promotion_subsidy NUMERIC(10,2),              -- cupons (iFood ou loja)
  net_value NUMERIC(10,2),                      -- valor líquido a receber
  
  -- status
  expected_settlement_date DATE,
  settled_at TIMESTAMPTZ,
  
  raw_payload JSONB,                            -- payload original da API Sales
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2. Mudanças em tabelas existentes

```sql
-- adicionar campos em ORDERS
ALTER TABLE orders ADD COLUMN external_order_id TEXT;
ALTER TABLE orders ADD COLUMN external_short_id TEXT;        -- ex: "2247" (visível na loja)
ALTER TABLE orders ADD COLUMN integration_id UUID REFERENCES integrations(id);
ALTER TABLE orders ADD COLUMN external_status TEXT;          -- 'PLC', 'CFM', etc.
ALTER TABLE orders ADD COLUMN external_metadata JSONB;       -- campos específicos do marketplace

-- mudar source para incluir mais opções
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE orders ADD CONSTRAINT orders_source_check 
  CHECK (source IN ('website','whatsapp','pos','ifood','pedidos10','goomer','foody'));

-- índice para busca rápida de pedido externo
CREATE INDEX idx_orders_external ON orders(integration_id, external_order_id);
```

---

## 4. Arquitetura: Adapter Pattern + ACL

### 4.1. Estrutura de pastas

```
src/lib/integrations/
├── core/
│   ├── types.ts                    # tipos do domínio interno (canônicos)
│   ├── ports.ts                    # interfaces (contracts)
│   │   ├─ IOrderProvider          # buscar pedidos
│   │   ├─ ICatalogProvider        # sincronizar cardápio
│   │   ├─ IStatusProvider         # atualizar status
│   │   └─ IFinancialProvider      # conciliação
│   ├── translator.ts               # helpers de tradução
│   └── registry.ts                 # registro de providers ativos
│
├── ifood/
│   ├── client.ts                   # cliente HTTP autenticado
│   ├── auth.ts                     # OAuth + cache de token
│   ├── adapter.ts                  # implementa IOrderProvider, etc.
│   ├── webhook.ts                  # validação de assinatura + parsing
│   ├── translators/
│   │   ├─ order.ts                # iFood Order → domínio interno
│   │   ├─ catalog.ts              # cardápio interno → iFood
│   │   └─ status.ts               # status interno → iFood
│   ├── polling.ts                  # worker (não roda em Vercel)
│   └── types.ts                    # tipos da API do iFood
│
├── pedidos10/
│   ├── adapter.ts
│   ├── routes.ts                   # endpoints que EXPOMOS para eles
│   └── translators/
│
├── open-delivery/
│   ├── adapter.ts                  # implementação genérica do padrão
│   └── routes.ts                   # endpoints Open Delivery padrão
│
└── service.ts                      # orquestrador: usa registry e despacha
```

### 4.2. Tipos canônicos do domínio interno

```typescript
// src/lib/integrations/core/types.ts

export interface CanonicalOrder {
  externalId: string;
  externalShortId?: string;
  source: 'ifood' | 'pedidos10' | 'open_delivery' | 'website' | 'whatsapp';
  
  customer: {
    name: string;
    phone?: string;
    document?: string;
  };
  
  type: 'delivery' | 'pickup' | 'dine_in';
  
  items: Array<{
    externalId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    options?: Array<{ name: string; price: number }>;
    notes?: string;
  }>;
  
  delivery?: {
    address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      cep: string;
      lat?: number;
      lng?: number;
    };
    fee: number;
    estimatedMinutes?: number;
    deliveryBy: 'merchant' | 'marketplace';   // iFood Marketplace vs FullServices
  };
  
  payment: {
    method: 'pix' | 'credit' | 'debit' | 'cash' | 'meal_voucher' | 'online' | 'other';
    isPaidOnline: boolean;
    total: number;
    subtotal: number;
    discount: number;
    benefits?: Array<{ sponsor: 'IFOOD' | 'EXTERNAL' | 'CHAIN'; value: number; target: string }>;
  };
  
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'concluded' | 'cancelled';
  
  scheduledFor?: Date;
  notes?: string;
  rawPayload: unknown;                          // sempre guardar original
}

export interface CanonicalCatalogSyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: Array<{ productId: string; error: string }>;
}
```

### 4.3. Interfaces (Ports)

```typescript
// src/lib/integrations/core/ports.ts

export interface IOrderProvider {
  /** Busca eventos novos (polling) ou processa um payload de webhook */
  fetchPendingEvents(): Promise<RawEvent[]>;
  acknowledgeEvent(eventId: string): Promise<void>;
  fetchOrderDetails(externalOrderId: string): Promise<CanonicalOrder>;
  
  /** Atualiza status no marketplace (loja confirma, prepara, despacha) */
  confirmOrder(externalOrderId: string): Promise<void>;
  dispatchOrder(externalOrderId: string): Promise<void>;
  cancelOrder(externalOrderId: string, reason: string): Promise<void>;
}

export interface ICatalogProvider {
  syncCatalog(restaurantId: string): Promise<CanonicalCatalogSyncResult>;
  updateProductAvailability(externalProductId: string, available: boolean): Promise<void>;
  updateProductPrice(externalProductId: string, price: number): Promise<void>;
}

export interface IStatusProvider {
  /** "Loja online no app" — heartbeat */
  ping(): Promise<{ online: boolean; validations: Validation[] }>;
  pause(reason: string, durationMinutes: number): Promise<void>;
  resume(): Promise<void>;
}

export interface IFinancialProvider {
  fetchSales(beginDate: Date, endDate: Date): Promise<CanonicalSale[]>;
  fetchFinancialEvents(beginDate: Date, endDate: Date): Promise<CanonicalFinancialEvent[]>;
}
```

### 4.4. Adapter do iFood (esqueleto)

```typescript
// src/lib/integrations/ifood/adapter.ts

export class IFoodOrderAdapter implements IOrderProvider {
  constructor(
    private client: IFoodClient,
    private translator: IFoodOrderTranslator,
    private integrationId: string
  ) {}
  
  async fetchPendingEvents(): Promise<RawEvent[]> {
    const events = await this.client.get('/events/v1.0/events:polling');
    return events.map(e => ({
      externalId: e.id,
      code: e.code,                              // 'PLC', 'CFM', etc.
      orderId: e.orderId,
      payload: e
    }));
  }
  
  async acknowledgeEvent(eventId: string): Promise<void> {
    // CRÍTICO: sem ack, iFood reentrega o evento eternamente
    await this.client.post('/events/v1.0/events/acknowledgment', {
      ids: [eventId]
    });
  }
  
  async fetchOrderDetails(orderId: string): Promise<CanonicalOrder> {
    const raw = await this.client.get(`/order/v1.0/orders/${orderId}`);
    return this.translator.toCanonical(raw);
  }
  
  async confirmOrder(orderId: string): Promise<void> {
    await this.client.post(`/order/v1.0/orders/${orderId}/confirm`);
  }
  
  async dispatchOrder(orderId: string): Promise<void> {
    await this.client.post(`/order/v1.0/orders/${orderId}/dispatch`);
  }
  
  async cancelOrder(orderId: string, reason: string): Promise<void> {
    await this.client.post(`/order/v1.0/orders/${orderId}/requestCancellation`, {
      reason,
      cancellationCode: 'MERCHANT_REQUESTED'
    });
  }
}
```

### 4.5. Validação de webhook iFood

```typescript
// src/lib/integrations/ifood/webhook.ts

import crypto from 'crypto';

export function verifyIFoodSignature(
  rawBody: string,                              // string, NÃO objeto parseado
  signatureHeader: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody, 'utf8');
  const expected = hmac.digest('hex');
  
  // timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}

// Endpoint: app/api/webhooks/ifood/route.ts
export async function POST(req: Request) {
  const rawBody = await req.text();             // IMPORTANTE: text(), não json()
  const signature = req.headers.get('x-ifood-signature');
  
  if (!signature) return new Response('Missing signature', { status: 401 });
  
  // 1. Identificar a integração pelo merchantId no payload
  const payload = JSON.parse(rawBody);
  const integration = await getIntegrationByMerchantId(payload.merchantId, 'ifood');
  
  if (!integration) return new Response('Unknown merchant', { status: 404 });
  
  // 2. Validar assinatura com o secret da integração
  if (!verifyIFoodSignature(rawBody, signature, integration.webhookSecret)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  // 3. Persistir evento (idempotência via UNIQUE constraint)
  await db.insert(integrationEvents).values({
    integrationId: integration.id,
    externalEventId: payload.id,
    eventCode: payload.code,
    externalOrderId: payload.orderId,
    rawPayload: payload,
    source: 'webhook',
    status: 'pending'
  }).onConflictDoNothing();
  
  // 4. Disparar processamento async (queue)
  await queue.enqueue('process-integration-event', { eventId: payload.id });
  
  // 5. Responder 202 RAPIDAMENTE (iFood considera timeout > 5s como falha)
  return new Response(null, { status: 202 });
}
```

---

## 5. Worker dedicado

### 5.1. Por que Vercel não serve para isso

| Necessidade | Vercel Serverless | Vercel Cron | Worker dedicado |
|-------------|-------------------|-------------|-----------------|
| Polling iFood a cada 30s | ❌ (cron mínimo: 1min Hobby, 1h em $20) | ⚠️ caro | ✅ |
| Heartbeat contínuo | ❌ | ❌ | ✅ |
| Job de longa duração (sync cardápio 500 produtos) | ❌ (10s Hobby, 60s Pro) | ❌ | ✅ |
| Retry de eventos falhos | ❌ | ⚠️ | ✅ |
| Custo previsível | ❌ (paga por execução) | ⚠️ | ✅ |

### 5.2. Opções recomendadas (em ordem de preferência)

#### Opção A: Trigger.dev (recomendada)
- Plataforma de jobs com UI bonita, retries automáticos, observabilidade
- Free tier: 10k runs/mês
- Plano Hobby: US$ 20/mês para 50k runs
- TypeScript nativo, mesma codebase do app
- Roda em background sem timeout

```typescript
// trigger/ifood-polling.ts
import { task } from '@trigger.dev/sdk';

export const ifoodPollingTask = task({
  id: 'ifood-polling',
  retry: { maxAttempts: 3 },
  run: async () => {
    const integrations = await getActiveIFoodIntegrations();
    
    for (const integration of integrations) {
      const adapter = createIFoodAdapter(integration);
      const events = await adapter.fetchPendingEvents();
      
      for (const event of events) {
        await processEvent(integration, event);
        await adapter.acknowledgeEvent(event.externalId);
      }
    }
  }
});

// scheduled em trigger.config.ts: every 30s
```

#### Opção B: Inngest
- Similar ao Trigger.dev, modelo event-driven
- Free tier generoso

#### Opção C: VPS própria (Hetzner / Digital Ocean)
- R$ 30-50/mês
- Roda Node.js + PM2 + cron
- Controle total
- Mais trabalho de manter

#### Opção D: Cloudflare Workers + Durable Objects
- Boa para webhook receivers
- Cron Triggers a cada 1min mínimo (ainda não atende 30s)

**Decisão recomendada:** começar com **Trigger.dev** (plano free dá conta de 1 pizzaria com folga). Migrar para VPS própria se passar de 5 pizzarias.

### 5.3. Estratégia de polling resiliente

```typescript
async function pollIFoodForRestaurant(integration: Integration) {
  const lockKey = `ifood-polling:${integration.id}`;
  
  // 1. Distributed lock (evita 2 workers fazendo polling da mesma loja)
  const acquired = await redis.set(lockKey, 'locked', { 
    nx: true, 
    ex: 60                                     // expira em 60s
  });
  if (!acquired) return;
  
  try {
    // 2. Refresh token se necessário (expira em 6h)
    if (isTokenExpired(integration)) {
      await refreshToken(integration);
    }
    
    // 3. Buscar eventos
    const adapter = createIFoodAdapter(integration);
    const events = await adapter.fetchPendingEvents();
    
    // 4. Persistir eventos com dedup
    const newEvents = await persistEventsWithDedup(integration.id, events);
    
    // 5. Acknowledge TODOS os eventos buscados (mesmo os duplicados)
    if (events.length > 0) {
      await adapter.acknowledgeEvent(events.map(e => e.externalId));
    }
    
    // 6. Processar novos eventos em background
    for (const event of newEvents) {
      await queue.enqueue('process-integration-event', { eventId: event.id });
    }
    
    // 7. Atualizar saúde da integração
    await db.update(integrations)
      .set({ 
        lastPollingAt: new Date(),
        consecutiveErrors: 0,
        lastError: null
      })
      .where(eq(integrations.id, integration.id));
      
  } catch (error) {
    await db.update(integrations)
      .set({ 
        consecutiveErrors: sql`consecutive_errors + 1`,
        lastError: error.message
      })
      .where(eq(integrations.id, integration.id));
      
    // Alertar se 5 erros seguidos (loja vai cair offline em 30s)
    if (integration.consecutiveErrors >= 4) {
      await notifyOwner(integration.restaurantId, 'iFood: integração com problema');
    }
  } finally {
    await redis.del(lockKey);
  }
}
```

---

## 6. Implementação iFood passo a passo

### Pré-requisitos
1. Cadastro em https://developer.ifood.com.br como integradora
2. Aceitar termos como "Aplicativo Centralizado" (multi-loja)
3. Anotar `clientId` e `clientSecret` do app de teste

### Etapa 1: Autenticação (1 dia)

```typescript
// src/lib/integrations/ifood/auth.ts

interface TokenResponse {
  accessToken: string;
  type: string;
  expiresIn: number;                            // 21600 (6h)
}

export async function getIFoodAccessToken(integration: Integration): Promise<string> {
  // Usa cache se ainda válido
  if (integration.accessTokenEncrypted && integration.accessTokenExpiresAt > new Date()) {
    return decrypt(integration.accessTokenEncrypted);
  }
  
  const credentials = decryptCredentials(integration.credentials);
  
  const res = await fetch('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grantType: 'client_credentials',
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret
    })
  });
  
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  
  const data: TokenResponse = await res.json();
  
  await db.update(integrations).set({
    accessTokenEncrypted: encrypt(data.accessToken),
    accessTokenExpiresAt: new Date(Date.now() + (data.expiresIn - 60) * 1000),  // -60s margem
    lastTokenRefreshAt: new Date()
  }).where(eq(integrations.id, integration.id));
  
  return data.accessToken;
}
```

### Etapa 2: Recebimento de pedidos (2-3 dias)

Workflow completo:
```
1. Webhook recebe POST com { code: 'PLC', orderId, merchantId, ... }
2. Validar assinatura HMAC
3. Persistir em integration_events (dedup via UNIQUE)
4. Responder 202 imediatamente
5. Worker pega evento → busca detalhes em /orders/{id}
6. Translator: payload iFood → CanonicalOrder
7. Insert em orders (com integration_id, external_order_id, source='ifood')
8. Insert em order_items
9. Realtime notifica o KDS
10. Operador clica "Aceitar" → adapter.confirmOrder() → status iFood vira CFM
11. Cozinha avança status normalmente
12. Operador clica "Saiu para entrega" → adapter.dispatchOrder()
```

### Etapa 3: Atualização de status (1 dia)

Mapeamento status interno ↔ iFood:

| Status interno | Ação iFood |
|----------------|-----------|
| `received` (após confirmar) | `POST /orders/{id}/confirm` |
| `preparing` | (não envia — iFood já assume após confirm) |
| `ready` (se pickup) | `POST /orders/{id}/readyToPickup` |
| `out_for_delivery` (Marketplace) | `POST /orders/{id}/dispatch` |
| `delivered` | (iFood detecta sozinho via app do entregador) |
| `cancelled` | `POST /orders/{id}/requestCancellation` |

### Etapa 4: Heartbeat / Presença (meio dia)

```typescript
// Job que roda a cada 30s para cada integração ativa
async function ifoodKeepAlive(integration: Integration) {
  const adapter = createIFoodAdapter(integration);
  
  // Para webhook: responder 202 nas requisições KEEPALIVE que iFood manda
  // Para polling: o próprio polling já faz o keep-alive implícito
  
  const status = await adapter.fetchStatus();
  
  if (!status.online) {
    // Loja caiu — alertar dono
    await notifyOwner(integration.restaurantId, 'Loja offline no iFood');
  }
}
```

### Etapa 5: Sincronização de cardápio (3-4 dias)

Ver [seção 8](#8-sincronização-de-cardápio).

### Etapa 6: Conciliação financeira (2 dias)

Ver [seção 9](#9-conciliação-financeira).

### Etapa 7: Homologação (2-4 semanas, calendário)

Ver [seção 10](#10-homologação-ifood-processo).

---

## 7. Implementação Pedidos10 passo a passo

A Pedidos10 segue um modelo onde **eles consultam a SUA API** (em vez de você consultar a deles). Você expõe endpoints; eles fazem polling.

### Endpoints a expor

```typescript
// src/app/api/integrations/pedidos10/[...]/route.ts

// GET /api/integrations/pedidos10/events
// Pedidos10 busca eventos pendentes
export async function GET(req: Request) {
  const auth = await verifyPedidos10Auth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });
  
  const events = await db.select()
    .from(outboundEvents)                       // tabela nova de eventos a enviar
    .where(and(
      eq(outboundEvents.targetProvider, 'pedidos10'),
      eq(outboundEvents.acknowledged, false)
    ))
    .limit(100);
    
  return Response.json({ events });
}

// POST /api/integrations/pedidos10/events/{id}/ack
// Pedidos10 confirma recebimento
export async function POST(req: Request, { params }) {
  await db.update(outboundEvents)
    .set({ acknowledged: true, acknowledgedAt: new Date() })
    .where(eq(outboundEvents.id, params.id));
    
  return new Response(null, { status: 204 });
}

// GET /api/integrations/pedidos10/orders/{externalId}
// Pedidos10 puxa detalhes do pedido
export async function GET(req: Request, { params }) {
  const order = await getOrderByExternalId(params.externalId);
  if (!order) return new Response('Not found', { status: 404 });
  
  // Traduzir do nosso formato para o formato do Pedidos10
  return Response.json(translateOrderToPedidos10(order));
}
```

### Fluxo

```
1. Cliente faz pedido no nosso cardápio próprio
2. Pedido é salvo em orders (source='website')
3. Trigger insere em outbound_events (target='pedidos10', se integração ativa)
4. Pedidos10 faz polling em /events e descobre o pedido novo
5. Pedidos10 busca detalhes em /orders/{id}
6. Pedidos10 envia ack
7. Pedidos10 atualiza status via POST /orders/{id}/status
8. Recebemos status, atualizamos pedido interno, refletimos no KDS
```

---

## 8. Sincronização de cardápio

Cada marketplace tem seu modelo de catálogo. Estratégia: **interno é fonte da verdade, marketplaces são reflexos**.

### 8.1. Quando sincronizar

| Evento | O que faz |
|--------|-----------|
| Produto criado/editado no admin | Push imediato para todas as integrações ativas |
| Produto pausado/disponibilizado | Push de availability rápido (endpoint dedicado) |
| Preço alterado | Push de price update |
| Sync manual (botão "ressincronizar tudo") | Job em background |
| Daily reconciliation | Job 4h da manhã compara cardápios e corrige drifts |

### 8.2. Mapeamento de produtos (a parte chata)

Pizza com 4 tamanhos × 5 bordas = 20 SKUs no iFood (cada combinação vira um item). Estratégia:
- Cada `product_size_id` interno gera 1 item no iFood (sabor + tamanho)
- Bordas viram **option groups** (complementos) na API do iFood
- Adicionais = option groups
- Meio a meio: o iFood suporta com `pizza` flag no item

### 8.3. Endpoint de availability rápido (crítico)

Quando acabou a mussarela às 22h e você marca produto X como indisponível:
- Push para iFood em < 5s (chamada API)
- Push para Pedidos10 (criar evento outbound)
- Atualizar cardápio próprio em tempo real (Realtime)

```typescript
async function setProductAvailability(productId: string, available: boolean) {
  // 1. Atualizar interno
  await db.update(products).set({ isAvailable: available }).where(eq(products.id, productId));
  
  // 2. Buscar mapeamentos externos
  const mappings = await db.select().from(productExternalMappings).where(eq(productExternalMappings.productId, productId));
  
  // 3. Push paralelo para todos
  await Promise.allSettled(
    mappings.map(m => {
      const adapter = adapterFor(m.integrationId);
      return adapter.updateProductAvailability(m.externalId, available);
    })
  );
}
```

---

## 9. Conciliação financeira

### 9.1. Por que isso importa

O dono da pizzaria paga ~12-25% de comissão pro iFood. Saber **exatamente** quanto foi vendido, quanto o iFood reteve e quanto vai cair na conta é vital.

### 9.2. Job diário de conciliação

```typescript
// Roda às 4h da manhã
async function dailyReconciliationJob() {
  const integrations = await getActiveIFoodIntegrations();
  const yesterday = subDays(new Date(), 1);
  
  for (const integration of integrations) {
    const adapter = createIFoodFinancialAdapter(integration);
    
    // 1. Buscar vendas do dia anterior
    const sales = await adapter.fetchSales(startOfDay(yesterday), endOfDay(yesterday));
    
    // 2. Para cada venda, encontrar pedido interno e gravar conciliação
    for (const sale of sales) {
      const order = await findOrderByExternalId(sale.shortId, integration.id);
      
      await db.insert(financialReconciliations).values({
        integrationId: integration.id,
        orderId: order?.id,
        externalOrderId: sale.id,
        grossValue: sale.saleGrossValue.bag,
        marketplaceFee: sale.feeValue,
        deliverySubsidy: sale.benefits?.find(b => b.target === 'DELIVERY_FEE')?.value || 0,
        netValue: sale.netValue,
        rawPayload: sale,
        expectedSettlementDate: sale.expectedSettlementDate
      });
    }
  }
}
```

### 9.3. Dashboard de conciliação

Tela `/admin/relatorios/conciliacao` mostra:
- Receita bruta vs receita líquida (diferença = comissão iFood + taxas)
- Pedidos não conciliados (suspeitos — vai investigar)
- Previsão de recebimento (próximas semanas)
- Comparativo mês a mês

---

## 10. Homologação iFood (processo)

⚠️ **Atenção:** sem homologação, a integração só funciona em **lojas teste**. Para produção, é obrigatório.

### Fluxo
1. Desenvolver integração no ambiente de teste (clientId/clientSecret de teste)
2. Acessar Portal do Desenvolvedor → Suporte → Chamados → "Homologação"
3. Receber formulário do iFood (perguntas sobre os módulos implementados)
4. Responder formulário usando dados reais do ambiente de teste (header `x-request-homologation: true`)
5. Agendar reunião de homologação (~1-2 semanas de espera)
6. Reunião com técnico do iFood (~1h) — eles validam casos de uso
7. Aprovação ou ajustes (pode ter 2-3 rodadas)
8. Após aprovação: criar app oficial → habilitar em lojas reais

**Tempo total realista:** 3-6 semanas calendário.

### Critérios principais que avaliam
- ✅ Validação de assinatura no webhook
- ✅ Idempotência (eventos duplicados não criam pedidos duplicados)
- ✅ Acknowledgment de eventos no polling
- ✅ Handling correto de cancelamento
- ✅ Modelo Marketplace vs FullServices respeitado
- ✅ Fuso horário tratado (timezone da loja)
- ✅ Tratamento de Benefícios (cupons iFood vs cupons da loja)
- ✅ UX para o lojista (telas claras de pedidos, conciliação visível)

---

## 11. Fase nova no roadmap: Fase 8

**Adicionar ao `PIZZARIA_DEV_PLAN.md`** depois da Fase 7 (Deploy).

### 🔌 Fase 8 — Integração com marketplaces (Dias 22-35)

**Objetivo:** receber pedidos do iFood e Pedidos10 no mesmo KDS, com conciliação financeira.

**Pré-requisitos:**
- ✅ Pizzaria já operando com cardápio próprio (Fase 7 concluída)
- ✅ Conta de integradora no iFood (cadastro feito)
- ✅ Conta Pedidos10 (se aplicável)
- ✅ Trigger.dev configurado (ou VPS para worker)

**Subfases:**

**8.1 — Foundation (Dias 22-24)**
- [ ] Migrations das novas tabelas (integrations, integration_events, etc.)
- [ ] Setup do Trigger.dev
- [ ] Estrutura de pastas `lib/integrations/`
- [ ] Tipos canônicos + interfaces (Ports)
- [ ] Tela admin de configuração de integração (formulário de credenciais)

**8.2 — iFood: receber pedidos (Dias 25-28)**
- [ ] Auth (OAuth + token cache)
- [ ] Webhook handler com validação HMAC
- [ ] Polling worker (Trigger.dev)
- [ ] Translator iFood → Canonical
- [ ] Persistência de pedidos com `source='ifood'`
- [ ] KDS exibindo pedidos iFood com badge visual
- [ ] Confirmação de pedido (botão "Aceitar" envia para iFood)
- [ ] Cancelamento

**8.3 — iFood: cardápio (Dias 29-31)**
- [ ] Mapeamento produtos internos → iFood
- [ ] Push de availability em tempo real
- [ ] Push de preço
- [ ] Sync inicial (job de import)
- [ ] Reconciliação diária

**8.4 — iFood: financeiro (Dia 32)**
- [ ] Job diário de conciliação (API Sales)
- [ ] Dashboard de receita bruta vs líquida
- [ ] Alertas de pedido não conciliado

**8.5 — Pedidos10 (Dias 33-34)**
- [ ] Endpoints expostos (events, orders, ack, status)
- [ ] Auth do parceiro
- [ ] Tabela outbound_events
- [ ] Trigger para gerar eventos quando pedido novo é criado
- [ ] Translators

**8.6 — Homologação iFood (paralelo, calendário 2-4 semanas)**
- [ ] Abrir chamado de homologação
- [ ] Preencher formulário
- [ ] Reunião com iFood
- [ ] Ajustes
- [ ] Aprovação e criação de app oficial

**8.7 — Open Delivery (Dia 35, opcional)**
- [ ] Implementar endpoints padrão Open Delivery
- [ ] Testar com Foody Delivery (homologação simples)
- [ ] Documentar para futuras integrações com hubs regionais

**Critério de aceite:**
- ✅ Pedido feito no app do iFood aparece no KDS em < 10s
- ✅ Aceitar pedido no KDS reflete no app do cliente em < 5s
- ✅ Cancelar pedido reflete corretamente
- ✅ Cardápio sincronizado com iFood (preço e disponibilidade)
- ✅ Relatório financeiro do dia bate com extrato do iFood
- ✅ Mesma experiência para Pedidos10
- ✅ Homologação iFood aprovada

---

## 📝 Resumo do que mudou

### Custos adicionais
| Item | Custo mensal |
|------|--------------|
| Trigger.dev (worker) | US$ 0–20 (free tier dá conta) |
| OU VPS Hetzner para worker | R$ 30–50 |
| Tempo de homologação iFood | 0 (mas trava lançamento por 3-6 semanas) |

### Tempo adicional de desenvolvimento
- ~14 dias de código (Fase 8)
- + ~3-6 semanas de calendário esperando homologação iFood

### Stack adicional
- Trigger.dev (jobs/workers)
- Redis (locks distribuídos) — Upstash free tier resolve
- pgsodium ou KMS externo (criptografia de credenciais no banco)

### Princípio que guia tudo
> "**Marketplaces são fontes externas. O domínio interno é canônico. Tradução acontece nas bordas.**"

Se o iFood mudar a API amanhã (e eles mudam), só o adapter quebra. O resto do sistema não vê.

---

**Esse documento responde: SIM, a aplicação vai suportar iFood + Pedidos10 + qualquer marketplace futuro, desde que a Fase 8 seja executada conforme acima.** 🚀
