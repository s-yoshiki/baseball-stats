import { describe, expect, it } from "vitest";
import { parsePlayerDetails } from "./player-details.js";

describe("parsePlayerDetails", () => {
  it("splits profile details into API-friendly values", () => {
    expect(
      parsePlayerDetails({
        ポジション: "内野手",
        投打: "右投左打",
        "身長／体重": "178cm／84kg",
        生年月日: "1996年7月4日",
        経歴: "春江工 - 中央大",
        ドラフト: "2014年ドラフト2位",
      }),
    ).toEqual({
      position: "内野手",
      throws: "右",
      bats: "左",
      heightCm: 178,
      weightKg: 84,
      birthDate: {
        iso: "1996-07-04",
        year: 1996,
        month: 7,
        day: 4,
      },
      career: {
        raw: "春江工 - 中央大",
        entries: ["春江工", "中央大"],
      },
      draft: {
        raw: "2014年ドラフト2位",
        year: 2014,
        rank: 2,
        selection: "regular",
      },
    });
  });

  it("handles development and outside draft labels", () => {
    expect(
      parsePlayerDetails({ ドラフト: "2024年育成選手ドラフト1位" }).draft,
    ).toEqual({
      raw: "2024年育成選手ドラフト1位",
      year: 2024,
      rank: 1,
      selection: "development",
    });
    expect(parsePlayerDetails({ ドラフト: "ドラフト外" }).draft).toEqual({
      raw: "ドラフト外",
      year: null,
      rank: null,
      selection: "outside",
    });
  });
});
