# Ticketing Projection Contract

## Scope

This document fixes the Phase 2 foundation contract between:

- outbox relay producer
- Kafka topic `ticketing.purchase-results`
- projection consumer
- read model query path `GET /api/ticketing/events/{eventId}/projection`

It intentionally covers only:

- `PURCHASE_SUCCEEDED`
- `PURCHASE_REJECTED`

No new event types should be added without updating this contract.

## Producer Envelope

Relay publishes a JSON envelope keyed by `requestId`.

```json
{
  "outboxId": 1201,
  "requestId": "req_phase2_0001",
  "eventType": "PURCHASE_SUCCEEDED",
  "payload": {
    "requestId": "req_phase2_0001",
    "eventId": 11,
    "userId": 42,
    "quantity": 2,
    "result": "SUCCESS",
    "ticketIds": [101, 102],
    "ticketNumbers": [1, 2],
    "remainingQuantity": 8,
    "message": "Purchase confirmed",
    "occurredAt": "2026-05-08T13:00:00Z"
  }
}
```

## Field Rules

- `outboxId`: authoritative idempotency key for consumers
- `requestId`: stable client retry key and Kafka message key
- `eventType`: `PURCHASE_SUCCEEDED` or `PURCHASE_REJECTED`
- `payload.result`: final purchase result
- `payload.occurredAt`: DB-authoritative event time from the purchase transaction
- `payload.remainingQuantity`: nullable, but should be present for normal success/rejection outcomes
- `payload.ticketIds`, `payload.ticketNumbers`: empty on rejected events

## Consumer Rules

- consumer idempotency is based on `outboxId`
- duplicate events must be ignored, not re-applied
- projection failures must not mutate the purchase core state
- projection lag is acceptable; projection must never overwrite or reinterpret the core purchase outcome

## Projection Read Model

Current table: `ticketing_purchase_projection`

Purpose:

- inspect recent purchase outcomes for one event
- confirm success vs rejection mix
- inspect last known remaining quantity from projected events

Current API:

- `GET /api/ticketing/events/{eventId}/projection?limit=20`
- Backend internal JWT scope: `ticketing:projection`
- Frontend proxy is disabled by default and must be explicitly enabled with an allowed operator user allowlist.

Current response shape:

- event-level counts:
  - `projectedCount`
  - `successCount`
  - `rejectedCount`
- recent attempts:
  - `outboxId`
  - `requestId`
  - `eventType`
  - `result`
  - `quantity`
  - `ticketIds`
  - `ticketNumbers`
  - `remainingQuantity`
  - `message`
  - `occurredAt`
  - `projectedAt`

## Change Discipline

- adding event types is a contract change
- renaming fields is a contract change
- changing idempotency from `outboxId` to another field is a contract change
- if payload changes, relay test and projection consumer test must be updated together
