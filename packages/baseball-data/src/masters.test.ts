import { describe, expect, it } from "vitest";
import type { MasterData } from "./masters.js";
import {
  normalizeMasterName,
  resolveSchool,
  resolveTeamSeason,
} from "./masters.js";

const masterData: MasterData = {
  leagues: [],
  teams: [],
  teamNames: [
    {
      id: "giants-modern",
      attributes: {
        teamId: "giants",
        name: "読売",
        leagueId: "central",
        startSeason: 1950,
        endSeason: null,
      },
    },
  ],
  schools: [
    {
      id: "university:中央大",
      attributes: {
        name: "中央大",
        normalizedName: "中央大",
        kind: "university",
      },
    },
  ],
};

describe("master data", () => {
  it("normalizes names before resolving a team season", () => {
    expect(normalizeMasterName(" 読 売 ")).toBe("読売");
    expect(resolveTeamSeason(" 読 売 ", 2024, masterData)).toMatchObject({
      teamId: "giants",
      leagueId: "central",
    });
  });

  it("resolves school references using the normalized name and kind", () => {
    expect(resolveSchool("中央大", masterData)).toMatchObject({
      id: "university:中央大",
      attributes: { kind: "university" },
    });
  });
});
