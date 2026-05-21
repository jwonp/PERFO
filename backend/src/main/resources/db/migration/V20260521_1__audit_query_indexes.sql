create index if not exists idx_issued_tickets_owner_id_desc
    on issued_tickets (owner_user_id, id desc);

create index if not exists idx_issued_tickets_status_open_at
    on issued_tickets (status, open_at);

create index if not exists idx_issued_tickets_status_valid_date
    on issued_tickets (status, valid_date);

create index if not exists idx_tickets_user_id_desc
    on tickets (user_id, id desc);

create index if not exists idx_tickets_event_user
    on tickets (event_id, user_id);

create index if not exists idx_events_public_listing
    on events (active, discovery_mode, sale_open_at, id);
