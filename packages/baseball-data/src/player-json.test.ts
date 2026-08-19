import { mkdtemp, readFile, rm } from "node:fs/promises";
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
      年度: "2024",
      所属球団: "テスト",
      試合: "10",
      打席: "30",
      打数: "30",
      安打: "10",
      塁打: "15",
    },
  ],
  pitchingStats: [],
};

describe("player API JSON", () => {
  it("creates a JSON API resource with raw and derived stats", () => {
    const document = toPlayerApiDocument(calculatePlayerStats(player), "now");

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
              sourceId: "npb",
              raw: { 年度: "2024", 安打: "10" },
              totals: { hits: 10 },
              metrics: { battingAverage: 0.333 },
            },
          ],
        },
        links: { self: "/players/test-player.json" },
      },
      meta: { generatedAt: "now" },
    });
    expect(document.data.attributes.profile.rawDetails).toEqual({
      npb: { 所属球団: "テスト" },
    });
    expect(document.meta.sources.map((source) => source.id)).toEqual([
      "npb",
      "baseball-stats",
    ]);
    expect(document.meta.provenance["battingStats[0].metrics"]).toMatchObject({
      sourceId: "baseball-stats",
      method: "calculated",
    });
  });

  it("writes one player document per file and reads it back", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "baseball-stats-player-json-"),
    );

    try {
      const enriched = calculatePlayerStats(player);
      await writePlayerDocuments(temporaryDirectory, [enriched], "now");

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
      expect(readPlayers[0]).toMatchObject(enriched);
      expect(readPlayers[0]?.sourceDetails).toEqual({
        npb: { 所属球団: "テスト" },
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
    const document = toPlayerApiDocument(aliasPlayer, "now");

    expect(document.data.attributes.profile).toMatchObject({
      familyName: "鈴木",
      givenName: "一朗",
      familyNameKana: "すずき",
      givenNameKana: "いちろう",
      registeredName: "イチロー",
      registeredNameKana: "いちろー",
    });
  });

  it("keeps alternative source data when recalculating", () => {
    const enriched = calculatePlayerStats({
      ...player,
      sourceDetails: {
        npb: player.detailInfo,
        "wikipedia-ja": { 身長: "180cm" },
      },
      sources: [
        {
          id: "wikipedia-ja",
          kind: "encyclopedia",
          name: "Wikipedia日本語版",
        },
      ],
      provenance: {
        "profile.details": {
          sourceId: "wikipedia-ja",
          method: "imported",
          updatedAt: "now",
        },
      },
    });
    const document = toPlayerApiDocument(enriched, "later");

    expect(document.data.attributes.profile.rawDetails["wikipedia-ja"]).toEqual(
      { 身長: "180cm" },
    );
    expect(document.meta.sources.map((source) => source.id)).toContain(
      "wikipedia-ja",
    );
    expect(document.meta.provenance["profile.details"]).toMatchObject({
      sourceId: "wikipedia-ja",
      method: "imported",
    });
  });
});
