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
      runs: "80",
      hits: "135",
      doubles: "20",
      triples: "3",
      homeRuns: "25",
      totalBases: "230",
      rbi: "90",
      steals: "10",
      caughtStealing: "2",
      sacrificeFlies: "5",
      walks: "40",
      hitByPitch: "5",
      strikeouts: "90",
    },
  ],
  pitchingStats: [
    {
      season: "2024",
      wins: "10",
      losses: "5",
      innings: "90.1",
      hitsAllowed: "80",
      homeRunsAllowed: "5",
      walksAllowed: "20",
      battersFaced: "350",
      strikeouts: "100",
      runsAllowed: "35",
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
      babip: 0.324,
      stolenBaseSuccessPercentage: 0.833,
      homeRunPercentage: 0.05,
      extraBaseHitPercentage: 0.356,
      runsPerPlateAppearance: 0.16,
      rbiPerPlateAppearance: 0.18,
      walkToStrikeoutRatio: 0.444,
    });
    expect(result.computedStats.pitching[0]).toMatchObject({
      season: 2024,
      winningPercentage: 0.667,
      era: 2.989,
      whip: 1.107,
      strikeoutsPerNine: 9.963,
      hitsPerNine: 7.97,
      homeRunsPerNine: 0.498,
      runsPerNine: 3.487,
      strikeoutPercentage: 0.286,
      walkPercentage: 0.057,
      strikeoutMinusWalkPercentage: 0.229,
    });
    expect(result.computedStats.career.batting.hits).toBe(135);
    expect(result.computedStats.career.pitching.innings).toBe(90.333);
  });
});
