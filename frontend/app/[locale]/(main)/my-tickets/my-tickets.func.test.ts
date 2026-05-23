import { describe, expect, it } from "vitest";
import {
    buildCreateTicketPayload,
    buildPublicBookingUrl,
    buildTicketPayload,
    isFutureVerifyingRequest,
    mapTicket,
    statusBadgeStyle,
    toDateTimeLocalValue,
    toIsoDateTime,
} from "./my-tickets.func";
import type { IssuedTicket, TicketForm } from "./my-tickets.types";

const baseForm: TicketForm = {
    name: "PERFO Summer Festival",
    venue: "올림픽공원 체조경기장",
    googlePlaceId: "ChIJ12345",
    detailAddress: "2층 A게이트 앞",
    validDate: "2026-08-15",
    openAt: "2026-08-15T17:00",
    totalCount: "100",
    allowDuplicate: true,
    maxPerUser: "2",
    discoveryMode: "LINK_ONLY",
    status: "VERIFYING",
    imageKey: "owner-1/42/cover.png",
    imageUrl: "/api/tickets/42/image",
    imageFile: null,
};

describe("my-tickets.func", () => {
    it("상태 배지 variant를 반환한다", () => {
        expect(statusBadgeStyle("ISSUING")).toBe("success");
        expect(statusBadgeStyle("INACTIVE")).toBe("neutral");
        expect(statusBadgeStyle("EXPIRED")).toBe("danger");
        expect(statusBadgeStyle("VERIFYING")).toBe("info");
    });

    it("ISO 시각을 datetime-local 값으로 변환한다", () => {
        expect(toDateTimeLocalValue("2026-08-15T08:00:00.000Z")).toMatch(/^2026-08-15T\d{2}:00$/);
        expect(toDateTimeLocalValue("")).toBe("");
        expect(toDateTimeLocalValue("invalid")).toBe("");
    });

    it("datetime-local 값을 ISO 시각으로 변환한다", () => {
        expect(toIsoDateTime("2026-08-15T17:00")).toMatch(/^2026-08-15T/);
        expect(toIsoDateTime("")).toBeNull();
        expect(toIsoDateTime("not-a-date")).toBeNull();
    });

    it("VERIFYING 상태와 미래 openAt 조합만 경고 대상으로 본다", () => {
        expect(isFutureVerifyingRequest("VERIFYING", "2099-01-01T00:00", Date.UTC(2026, 0, 1))).toBe(true);
        expect(isFutureVerifyingRequest("VERIFYING", "2020-01-01T00:00", Date.UTC(2026, 0, 1))).toBe(false);
        expect(isFutureVerifyingRequest("ISSUING", "2099-01-01T00:00", Date.UTC(2026, 0, 1))).toBe(false);
        expect(isFutureVerifyingRequest("VERIFYING", "", Date.UTC(2026, 0, 1))).toBe(false);
    });

    it("서버 응답을 issued ticket 모델로 매핑한다", () => {
        expect(
            mapTicket({
                id: 42,
                name: "Backend Synced Ticket",
                venue: "잠실실내체육관",
                googlePlaceId: "ChIJBACKEND",
                detailAddress: "1층 입구",
                validDate: "2026-09-01",
                openAt: "2026-09-01T09:00:00Z",
                imageKey: "owner-1/42/original.png",
                imageUrl: "/api/tickets/42/image",
                status: "VERIFYING",
                issuedCount: 25,
                totalCount: 100,
                allowDuplicate: true,
                maxPerUser: 2,
                discoveryMode: "LINK_ONLY",
                eventId: 42,
                publicBookingPath: "/events/42",
            }),
        ).toEqual(
            expect.objectContaining({
                id: "42",
                name: "Backend Synced Ticket",
                googleMapsUrl:
                    "https://www.google.com/maps/search/?api=1&query=%EC%9E%A0%EC%8B%A4%EC%8B%A4%EB%82%B4%EC%B2%B4%EC%9C%A1%EA%B4%80&query_place_id=ChIJBACKEND",
                status: "VERIFYING",
                issuedCount: 25,
                discoveryMode: "LINK_ONLY",
                publicBookingPath: "/events/42",
            }),
        );
    });

    it("수정 payload를 기존 요청 바디와 동일하게 만든다", () => {
        expect(buildTicketPayload(baseForm, "owner-1/42/new.png")).toEqual({
            name: "PERFO Summer Festival",
            venue: "올림픽공원 체조경기장",
            googlePlaceId: "ChIJ12345",
            detailAddress: "2층 A게이트 앞",
            validDate: "2026-08-15",
            openAt: expect.any(String),
            totalCount: 100,
            allowDuplicate: true,
            maxPerUser: 2,
            discoveryMode: "LINK_ONLY",
            status: "VERIFYING",
            imageKey: "owner-1/42/new.png",
        });
    });

    it("생성 payload는 상태와 이미지 키를 제외한다", () => {
        expect(buildCreateTicketPayload(baseForm)).toEqual({
            name: "PERFO Summer Festival",
            venue: "올림픽공원 체조경기장",
            googlePlaceId: "ChIJ12345",
            detailAddress: "2층 A게이트 앞",
            validDate: "2026-08-15",
            openAt: expect.any(String),
            totalCount: 100,
            allowDuplicate: true,
            maxPerUser: 2,
            discoveryMode: "LINK_ONLY",
        });
    });

    it("공개 예매 URL을 절대 경로로 조립한다", () => {
        const ticket: IssuedTicket = {
            id: "42",
            eventId: "42",
            name: "PERFO Summer Festival",
            venue: "올림픽공원 체조경기장",
            detailAddress: "2층 A게이트 앞",
            googleMapsUrl: "https://maps.example.com",
            googlePlaceId: "ChIJ12345",
            validDate: "2026-08-15",
            openAt: "2026-08-15T08:00:00.000Z",
            imageKey: "owner-1/42/cover.png",
            imageUrl: "/api/tickets/42/image",
            status: "VERIFYING",
            issuedCount: 25,
            totalCount: 100,
            allowDuplicate: true,
            maxPerUser: 2,
            discoveryMode: "LINK_ONLY",
            publicBookingPath: "/events/42",
        };

        expect(buildPublicBookingUrl({ ...ticket, publicBookingUrl: "https://perfo.kr/custom" }, "ko", "https://perfo.kr")).toBe(
            "https://perfo.kr/custom",
        );
        expect(buildPublicBookingUrl(ticket, "ko", "https://perfo.kr")).toBe("https://perfo.kr/ko/events/42");
        expect(buildPublicBookingUrl({ ...ticket, publicBookingPath: undefined }, "ko", "https://perfo.kr")).toBeNull();
        expect(buildPublicBookingUrl(ticket, "ko", null)).toBeNull();
    });
});
