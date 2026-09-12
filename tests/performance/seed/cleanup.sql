-- seed.sql로 만든 데이터 + 테스트 도중 그 위에서 생성된 티켓/주문을 전부 제거.
-- FK 순서: 자식 테이블부터 지운다.

begin;

delete from tickets
    where event_id in (select id from events where name in ('LOADTEST_SMALL_STOCK', 'LOADTEST_LARGE_STOCK', 'LOADTEST_ITEMIZED'));

delete from ticketing_requests
    where event_id in (select id from events where name in ('LOADTEST_SMALL_STOCK', 'LOADTEST_LARGE_STOCK', 'LOADTEST_ITEMIZED'));

delete from booking_order_items
    where order_id in (
        select id from booking_orders
        where event_id in (select id from events where name in ('LOADTEST_SMALL_STOCK', 'LOADTEST_LARGE_STOCK', 'LOADTEST_ITEMIZED'))
    );

delete from booking_orders
    where event_id in (select id from events where name in ('LOADTEST_SMALL_STOCK', 'LOADTEST_LARGE_STOCK', 'LOADTEST_ITEMIZED'));

delete from booking_draft_items
    where draft_id in (
        select id from booking_drafts
        where event_id in (select id from events where name in ('LOADTEST_SMALL_STOCK', 'LOADTEST_LARGE_STOCK', 'LOADTEST_ITEMIZED'))
    );

delete from booking_drafts
    where event_id in (select id from events where name in ('LOADTEST_SMALL_STOCK', 'LOADTEST_LARGE_STOCK', 'LOADTEST_ITEMIZED'));

delete from event_items
    where event_id in (select id from events where name in ('LOADTEST_SMALL_STOCK', 'LOADTEST_LARGE_STOCK', 'LOADTEST_ITEMIZED'));

delete from events where name in ('LOADTEST_SMALL_STOCK', 'LOADTEST_LARGE_STOCK', 'LOADTEST_ITEMIZED');

delete from users where email like 'load-test-user-%@perfo.test';

commit;
