import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  readPlayerDocuments,
  toPlayerApiDocument,
  writePlayerDocuments,
} from "./player-json.js";
import { calculatePlayerStats } from "./stats.js";
import type { RawPlayer } from "./types.js";

const player: RawPlayer = {
  id: "test-player",
  playerUrl: "https://npb.jp/bis/players/123.html",
  playerName: "テスト 太郎",
  kanaName: "テスト タロウ",
  isActive: true,
  detailInfo: { 所属球団: "テスト" },
  battingStats: [
    {
      season: "2024",
      team: "テスト",
      games: "10",
      plateAppearances: "30",
      atBats: "30",
      hits: "10",
      totalBases: "15",
    },
  ],
  pitchingStats: [],
};

describe("player API JSON", () => {
  it("separates formatted API data from raw scrape data", () => {
    const document = toPlayerApiDocument(calculatePlayerStats(player));

    expect(document).toMatchObject({
      data: {
        type: "player",
        id: "test-player",
        attributes: {
          profile: {
            familyName: "テスト",
            givenName: "太郎",
            familyNameKana: "テスト",
            givenNameKana: "タロウ",
            registeredName: "テスト 太郎",
            registeredNameKana: "テスト タロウ",
          },
          battingStats: [
            {
              season: 2024,
              totals: { hits: 10 },
              metrics: { battingAverage: 0.333 },
            },
          ],
        },
        links: { self: "/players/test-player.json" },
      },
    });
    expect(document.data.attributes.profile).not.toHaveProperty("raw");
    expect(document.data.attributes.profile).not.toHaveProperty("rawDetails");
    expect(document.data.attributes.battingStats[0]).not.toHaveProperty("raw");
    expect(document.data.attributes.battingStats[0]).not.toHaveProperty(
      "sourceId",
    );
    expect(document).not.toHaveProperty("meta");
    expect(document).not.toHaveProperty("raw");
  });

  it("writes one player document per file and reads it back", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "baseball-stats-player-json-"),
    );

    try {
      const enriched = calculatePlayerStats(player);
      await writePlayerDocuments(temporaryDirectory, [enriched]);

      const index = JSON.parse(
        await readFile(path.join(temporaryDirectory, "index.json"), "utf8"),
      ) as { data: Array<{ id: string }> };
      expect(index.data).toEqual([
        {
          type: "player",
          id: "test-player",
          attributes: {
            familyName: "テスト",
            givenName: "太郎",
            familyNameKana: "テスト",
            givenNameKana: "タロウ",
            registeredName: "テスト 太郎",
            registeredNameKana: "テスト タロウ",
            isActive: true,
          },
          links: { self: "/players/test-player.json" },
        },
      ]);
      const readPlayers = await readPlayerDocuments(temporaryDirectory);
      expect(readPlayers).toHaveLength(1);
      expect(readPlayers[0]).toMatchObject({
        id: enriched.id,
        playerName: enriched.playerName,
        kanaName: enriched.kanaName,
        battingStats: enriched.battingStats,
        computedStats: enriched.computedStats,
      });
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("splits a registered name and the name in parentheses", () => {
    const aliasPlayer = calculatePlayerStats({
      ...player,
      playerName: "イチロー（鈴木 一朗）",
      kanaName: "いちろー（すずき・いちろう）",
    });
    const document = toPlayerApiDocument(aliasPlayer);

    expect(document.data.attributes.profile).toMatchObject({
      familyName: "鈴木",
      givenName: "一朗",
      familyNameKana: "すずき",
      givenNameKana: "いちろう",
      registeredName: "イチロー",
      registeredNameKana: "いちろー",
    });
  });

  it("reads a clean document without requiring raw fields", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "baseball-stats-clean-player-json-"),
    );

    try {
      await writePlayerDocuments(temporaryDirectory, [
        calculatePlayerStats(player),
      ]);
      const parsed = JSON.parse(
        await readFile(
          path.join(temporaryDirectory, "test-player.json"),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(parsed).not.toHaveProperty("raw");
      expect(await readPlayerDocuments(temporaryDirectory)).toHaveLength(1);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("applies sparse player overrides after generating API data", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "baseball-stats-player-overrides-"),
    );
    const overridesDirectory = path.join(temporaryDirectory, "overrides");
    const outputDirectory = path.join(temporaryDirectory, "players");

    try {
      await mkdir(overridesDirectory, { recursive: true });
      await writeFile(
        path.join(overridesDirectory, "test-player.json"),
        `${JSON.stringify({
          profile: { details: { position: "捕手" } },
        })}\n`,
      );
      await writePlayerDocuments(
        outputDirectory,
        [calculatePlayerStats(player)],
        overridesDirectory,
      );
      const document = JSON.parse(
        await readFile(path.join(outputDirectory, "test-player.json"), "utf8"),
      ) as {
        data: { attributes: { profile: { details: { position: string } } } };
      };
      expect(document.data.attributes.profile.details.position).toBe("捕手");
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
