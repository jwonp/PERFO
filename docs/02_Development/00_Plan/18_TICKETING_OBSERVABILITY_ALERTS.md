# Ticketing Observability And Alert Rules

## Scope

This hardening step does not change ticketing core flow.

It only adds application-level observability for:

- outbox relay
- projection consumer
- operational response rules

## Metrics

### Relay

- `perfo.ticketing.outbox.publish.success`
  - tags: `eventType`
- `perfo.ticketing.outbox.publish.failure`
  - tags: `eventType`, `reason`
- `perfo.ticketing.outbox.publish.retry`
  - tags: `eventType`
- `perfo.ticketing.outbox.pending.count`
  - gauge
- `perfo.ticketing.outbox.failed.count`
  - gauge

### Projection Consumer

- `perfo.ticketing.projection.consume.success`
  - tags: `eventType`, `result`
- `perfo.ticketing.projection.consume.duplicate_skip`
  - tags: `eventType`
- `perfo.ticketing.projection.consume.failure`
  - tags: `reason`, `eventType`
- `perfo.ticketing.projection.last_lag.seconds`
  - gauge
  - based on `now - payload.occurredAt` for the last successfully projected event
- `perfo.ticketing.projection.seconds_since_last_success`
  - gauge
  - based on wall-clock time since the last successfully projected event

## Structured Log Keys

Relay logs:

- `outboxId`
- `requestId`
- `eventType`
- `retryCount`
- `reason`

Projection logs:

- `outboxId`
- `requestId`
- `eventType`
- `result`
- `reason`
- `lagSeconds`

## Initial Alert Rules

### 1. Pending Outbox Backlog

Condition:

- `perfo.ticketing.outbox.pending.count > 100` for 5 minutes

Meaning:

- relay is not draining fast enough
- Kafka connectivity or relay worker health may be degraded

Immediate actions:

1. check relay enabled flag and app logs
2. inspect `publish.failure` reason distribution
3. verify Kafka broker health

### 2. Failed Outbox Growth

Condition:

- `perfo.ticketing.outbox.failed.count > 0` for 10 minutes
- or sudden increase after ticket open

Meaning:

- publish is repeatedly failing
- projection freshness will degrade

Immediate actions:

1. inspect `perfo.ticketing.outbox.publish.failure`
2. group by `reason`
3. verify retry is progressing and not flatlined

### 3. Projection Lag

Condition:

- `perfo.ticketing.projection.last_lag.seconds > 60` for 5 minutes
- or `perfo.ticketing.projection.seconds_since_last_success > 60` while outbox publish success is increasing

Meaning:

- consumer is behind or not consuming

Immediate actions:

1. inspect consumer logs for `consume.failure`
2. compare outbox published volume vs consumer success volume
3. verify Kafka topic delivery and consumer startup flag

### 4. Consumer Failure Spike

Condition:

- `perfo.ticketing.projection.consume.failure` rises continuously for 5 minutes

Meaning:

- invalid payload or persistence issue

Immediate actions:

1. split by `reason`
2. if `invalid_message`, verify relay payload contract
3. if `persistence_error`, inspect DB availability and schema drift

## Open-Time Smoke Checks

- `/actuator/metrics/perfo.ticketing.outbox.pending.count`
- `/actuator/metrics/perfo.ticketing.outbox.failed.count`
- `/actuator/metrics/perfo.ticketing.outbox.publish.success`
- `/actuator/metrics/perfo.ticketing.projection.consume.success`
- `/actuator/metrics/perfo.ticketing.projection.last_lag.seconds`
- `/actuator/metrics/perfo.ticketing.projection.seconds_since_last_success`

Expected shape right after open:

- publish success increases
- projection success increases
- pending count may spike briefly but should fall
- failed count should stay near zero
- lag should stay bounded and recover quickly

## Explicitly Out Of Scope

- dead-letter queue implementation
- Prometheus/Grafana infrastructure provisioning
- waiting room
- Redis front-door controls
- service decomposition
- ticketing core transaction changes
