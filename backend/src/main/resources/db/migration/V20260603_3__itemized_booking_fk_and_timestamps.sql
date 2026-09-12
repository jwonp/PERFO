begin;

alter table event_items
    add column if not exists created_at timestamp(6),
    add column if not exists updated_at timestamp(6);

alter table event_items
    add constraint fk_event_items_event foreign key (event_id) references events (id);

create index if not exists idx_events_sale_close_at
    on events (sale_close_at);

alter table booking_drafts
    add constraint fk_booking_drafts_event foreign key (event_id) references events (id);

alter table booking_draft_items
    add constraint fk_booking_draft_items_draft foreign key (draft_id) references booking_drafts (id),
    add constraint fk_booking_draft_items_event_item foreign key (event_item_id) references event_items (id);

alter table booking_orders
    add constraint fk_booking_orders_event foreign key (event_id) references events (id);

alter table booking_order_items
    add constraint fk_booking_order_items_order foreign key (order_id) references booking_orders (id),
    add constraint fk_booking_order_items_event_item foreign key (event_item_id) references event_items (id);

commit;
