import { describe, expect, it } from "vitest";
import {
    formatUsedAt,
    resultLabelKey,
    resultMeta,
    shouldIgnoreDuplicateScan,
} from "./scan.func";

describe("scan.func", () => {
    it("검표 결과 key를 번역 key로 매핑한다", () => {
        expect(resultLabelKey("SUCCESS")).toBe("myTickets.scanResultSuccess");
        expect(resultLabelKey("ALREADY_USED")).toBe("myTickets.scanResultAlreadyUsed");
        expect(resultLabelKey("INVALID")).toBe("myTickets.scanResultInvalid");
        expect(resultLabelKey("UNKNOWN")).toBeNull();
    });

    it("검표 결과 meta를 성공/실패 스타일로 나눈다", () => {
        expect(resultMeta("SUCCESS")).toEqual(
            expect.objectContaining({
                badgeVariant: "success",
                bodyClassName: "text-[var(--success)]",
            }),
        );
        expect(resultMeta("INVALID")).toEqual(
            expect.objectContaining({
                badgeVariant: "danger",
                bodyClassName: "text-[var(--danger)]",
            }),
        );
    });

    it("usedAt을 화면용 문자열로 포맷한다", () => {
        expect(formatUsedAt("2026-04-28T12:00:10Z")).toMatch(/\d{2}.*\d{2}.*\d{2}/);
        expect(formatUsedAt("")).toBeNull();
        expect(formatUsedAt("not-a-date")).toBe("not-a-date");
    });

    it("최근 스캔과 cooldown 기준으로 중복 스캔 무시 여부를 계산한다", () => {
        expect(shouldIgnoreDuplicateScan(null, "abc", 1_000, 1_200)).toBe(false);
        expect(shouldIgnoreDuplicateScan({ token: "abc", at: 100 }, "abc", 1_000, 1_200)).toBe(true);
        expect(shouldIgnoreDuplicateScan({ token: "abc", at: 100 }, "xyz", 1_000, 1_200)).toBe(false);
        expect(shouldIgnoreDuplicateScan({ token: "abc", at: 100 }, "abc", 1_500, 1_200)).toBe(false);
    });
});
