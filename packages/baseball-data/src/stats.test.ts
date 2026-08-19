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
      season: "2024",
      team: "テスト",
      plateAppearances: "500",
      atBats: "450",
      hits: "135",
      totalBases: "230",
      walks: "40",
      hitByPitch: "5",
      strikeouts: "90",
    },
  ],
  pitchingStats: [
    {
      season: "2024",
      innings: "90.1",
      hitsAllowed: "80",
      walksAllowed: "20",
      strikeouts: "100",
      earnedRuns: "30",
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
