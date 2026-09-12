-- 부하테스트용 시드 데이터. load-test- / LOADTEST_ 접두사로 식별 가능하게 만들어서
-- cleanup.sql로 통째로 제거할 수 있게 한다. seed.sh가 psql -v user_count=<N> 으로 호출한다.

begin;

insert into users (email, password, name, provider, role, created_at, updated_at)
select
    format('load-test-user-%s@perfo.test', n),
    null,
    format('Load Test User %s', n),
    'loadtest',
    'USER',
    now(),
    now()
from generate_series(1, :user_count) as n
on conflict (email) do nothing;

-- 재실행 안전하게: itemized 이벤트의 자식(booking_drafts/event_items)부터 지운 뒤 이벤트 삭제.
-- (event_items -> events, booking_drafts -> events FK가 있어 이벤트를 먼저 못 지운다.)
delete from booking_draft_items
    where draft_id in (
        select id from booking_drafts
        where event_id in (select id from events where name = 'LOADTEST_ITEMIZED')
    );
delete from booking_drafts
    where event_id in (select id from events where name = 'LOADTEST_ITEMIZED');
delete from event_items
    where event_id in (select id from events where name = 'LOADTEST_ITEMIZED');

delete from events where name in ('LOADTEST_SMALL_STOCK', 'LOADTEST_LARGE_STOCK', 'LOADTEST_ITEMIZED');

insert into events (
    name, venue, valid_from, valid_until, total_quantity, remaining_quantity,
    sale_open_at, sale_close_at, max_per_user, allow_duplicate, next_ticket_number,
    active, booking_mode, discovery_mode
) values
    -- 오버셀 경쟁 테스트용: 재고를 작게 잡아 동시 요청 시 SOLD_OUT 분기가 바로 나오게 한다.
    ('LOADTEST_SMALL_STOCK', 'Load Test Venue', now(), now() + interval '1 day',
     50, 50, now() - interval '1 hour', now() + interval '1 day', 1, false, 1,
     true, 'SIMPLE', 'LINK_ONLY'),
    -- steady load / spike 테스트용: 재고 고갈로 인한 SOLD_OUT 분기 없이 순수 latency만 보게 한다.
    ('LOADTEST_LARGE_STOCK', 'Load Test Venue', now(), now() + interval '1 day',
     100000, 100000, now() - interval '1 hour', now() + interval '1 day', 10, false, 1,
     true, 'SIMPLE', 'LINK_ONLY');

-- draft CRUD 시나리오용: booking_mode=ITEMIZED 이벤트 + event_items.
-- draft는 ITEMIZED 이벤트에서만 동작하고(BookingDraftService), PUT 시 item이 실제
-- event_items 행이어야 하므로(booking_draft_items FK) 미리 만들어 둔다.
-- item id는 IDENTITY라 고정값을 알 수 없어 k6 setup()에서 GET /api/events/{id}로 조회한다.
with itemized_event as (
    insert into events (
        name, venue, valid_from, valid_until, total_quantity, remaining_quantity,
        sale_open_at, sale_close_at, max_per_user, allow_duplicate, next_ticket_number,
        active, booking_mode, discovery_mode
    ) values (
        'LOADTEST_ITEMIZED', 'Load Test Venue', now(), now() + interval '1 day',
        100000, 100000, now() - interval '1 hour', now() + interval '1 day', 10, false, 1,
        true, 'ITEMIZED', 'LINK_ONLY'
    )
    returning id
)
insert into event_items (
    event_id, name, description, image_url, price,
    total_quantity, remaining_quantity, max_per_user, active, sort_order
)
select ie.id, v.name, null, null, v.price, 100000, 100000, 10, true, v.sort_order
from itemized_event ie
cross join (values
    ('LOADTEST_ITEM_A', 30000, 0),
    ('LOADTEST_ITEM_B', 50000, 1),
    ('LOADTEST_ITEM_C', 80000, 2),
    ('LOADTEST_ITEM_D', 120000, 3)
) as v(name, price, sort_order);

commit;
