import { describe, expect, it } from "vitest";
import {
  getHighlightedTextSegments,
  getPredictionName,
  normalizePlaceId,
} from "./place-autocomplete.func";

describe("place-autocomplete.func", () => {
  it("normalizePlaceId는 형식이 맞지 않으면 undefined를 반환한다", () => {
    expect(normalizePlaceId(" bad id ")).toBeUndefined();
    expect(normalizePlaceId("")).toBeUndefined();
  });

  it("normalizePlaceId는 유효한 place id를 trim 후 유지한다", () => {
    expect(normalizePlaceId(" ChIJPLACE123 ")).toBe("ChIJPLACE123");
  });

  it("getPredictionName은 main_text를 우선 사용한다", () => {
    expect(
      getPredictionName({
        description: "KSPO DOME, 서울 송파구",
        structured_formatting: {
          main_text: "KSPO DOME",
        },
      }),
    ).toBe("KSPO DOME");
  });

  it("getHighlightedTextSegments는 matched substring을 기준으로 분리한다", () => {
    expect(
      getHighlightedTextSegments({
        description: "올림픽공원 체조경기장",
        structured_formatting: {
          main_text: "올림픽공원 체조경기장",
          main_text_matched_substrings: [{ offset: 0, length: 2 }],
        },
      }),
    ).toEqual([
      { text: "올림", highlighted: true },
      { text: "픽공원 체조경기장", highlighted: false },
    ]);
  });
});
