import { describe, expect, it } from "vitest";
import { calculatePlayerStats } from "./stats.js";
import type { RawPlayer } from "./types.js";

const player: RawPlayer = {
  id: "abc",
  playerUrl: "https://npb.jp/bis/players/12345.html",
  playerName: "テスト 太郎",
  kanaName: "テスト タロウ",
  isActive: true,
  detailInfo: {},
  battingStats: [
    {
      年度: "2024",
      所属球団: "テスト",
      打席: "500",
      打数: "450",
      安打: "135",
      塁打: "230",
      四球: "40",
      死球: "5",
      三振: "90",
    },
  ],
  pitchingStats: [
    {
      年度: "2024",
      投球回: "90.1",
      安打: "80",
      四球: "20",
      奪三振: "100",
      自責点: "30",
    },
  ],
};

describe("calculatePlayerStats", () => {
  it("calculates derived batting and pitching metrics", () => {
    const result = calculatePlayerStats(player);

    expect(result.computedStats.batting[0]).toMatchObject({
      season: 2024,
      battingAverage: 0.3,
      onBasePercentage: 0.36,
      sluggingPercentage: 0.511,
      ops: 0.871,
      walkPercentage: 0.08,
    });
    expect(result.computedStats.pitching[0]).toMatchObject({
      season: 2024,
      era: 2.989,
      whip: 1.107,
      strikeoutsPerNine: 9.963,
    });
    expect(result.computedStats.career.batting.hits).toBe(135);
    expect(result.computedStats.career.pitching.innings).toBe(90.333);
  });
});
