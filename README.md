# event-driven-nest-ts

Sistema de vendas de alta concorrência inspirado em cenários de **drop de estoque limitado** (tipo Black Friday ou um restock de item raro): centenas de pessoas podem tentar comprar o mesmo produto ao mesmo tempo, e o sistema precisa garantir que **nunca** venda mais do que existe em estoque — sem deixar o banco de dados apanhar.

## O problema que este projeto resolve

Se 100 (ou 10.000) requisições batem ao mesmo tempo pedindo o último item do estoque, uma arquitetura ingênua (verificar estoque no Postgres, decidir, depois salvar) sofre de **race conditions**: múltiplas requisições podem "ver" estoque disponível ao mesmo tempo e todas passarem, vendendo mais unidades do que existem.

Este projeto resolve isso colocando o **Redis como porteiro** antes de qualquer operação pesada no banco:

1. A requisição chega na API (NestJS).
2. O Redis executa um `DECRBY` **atômico** no contador de estoque do produto.
3. Se o resultado for negativo, a operação é revertida (`INCRBY`) e o pedido é rejeitado — sem tocar no banco.
4. Se houver estoque, o pedido é aceito na hora (resposta rápida ao cliente) e um **job é enfileirado no BullMQ**.
5. Um **worker** consome essa fila em segundo plano, processando a gravação no Postgres e simulando o envio de e-mail de confirmação — de forma assíncrona, sem travar a resposta da API.

Como o `DECRBY` do Redis é atômico, mesmo com dezenas de requisições concorrentes, o estoque nunca fica negativo e nenhuma venda é duplicada.

## Arquitetura

```
Cliente (Postman / script de carga)
        │
        ▼
   NestJS API (HTTP)
        │
        ├──► Redis: DECRBY estoque (gate atômico de concorrência)
        │        │
        │        ├── estoque < 0 → reverte (INCRBY) e rejeita (422)
        │        └── estoque OK  → aceita (202) e segue
        │
        ▼
   BullMQ Queue (order-status-queue)
        │
        ▼
   Worker (OrderProcessor)
        │
        ├──► Postgres: grava o pedido confirmado
        └──► Simula envio de e-mail de confirmação
```

## Stack

- **NestJS** — framework da API e do worker
- **Redis (ioredis)** — gate de concorrência atômico (`DECRBY`/`INCRBY`) sobre o estoque
- **BullMQ** — fila de processamento assíncrono, também usando Redis como broker
- **TypeORM + PostgreSQL** — persistência dos pedidos confirmados
- **class-validator** — validação de payload (`CreateOrderDto`)

## Como rodar localmente

### Pré-requisitos
- Node 20+
- Uma instância de Redis (local ou cloud, ex: Upstash/Redis Cloud)
- Uma instância de Postgres (local ou cloud, ex: Neon)

### Passo a passo

```bash
npm install
```

Configure o `.env` na raiz com:

```env
DATABASE_URL=postgres://usuario:senha@host:5432/database
REDIS_URL=redis://usuario:senha@host:porta
```

Suba o servidor em modo desenvolvimento:

```bash
npm run start:dev
```

A API sobe em `http://localhost:3000`.

### Com Docker

```bash
docker-compose up --build
```

O `docker-compose.yml` sobe apenas a API em container; Redis e Postgres continuam sendo os serviços configurados no `.env` (não são containerizados neste projeto).

## Endpoint principal

**POST** `/order`

```json
{
  "productId": "8IERhqSGrGXt",
  "quantity": 1,
  "email": "cliente@teste.com"
}
```

Respostas:
- `202 Accepted` — pedido aceito, estoque reservado, job enfileirado
- `422 Unprocessable Entity` — estoque insuficiente para o produto

- [ ] Testes automatizados (unit + e2e) do fluxo de concorrência
- [ ] Dashboard de monitoramento da fila (Bull Board)
- [ ] Endpoint de consulta de status do pedido
