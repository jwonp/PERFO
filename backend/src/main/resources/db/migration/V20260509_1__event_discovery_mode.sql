begin;

alter table if exists events
    add column if not exists discovery_mode varchar(32) not null default 'LISTED',
    add column if not exists issued_ticket_id bigint;

alter table if exists issued_tickets
    add column if not exists discovery_mode varchar(32) not null default 'LISTED',
    add column if not exists event_id bigint;

commit;
