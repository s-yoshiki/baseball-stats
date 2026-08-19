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
      schemaVersion: 2,
      data: {
        type: "player",
        id: "test-player",
        attributes: {
          profile: { name: "テスト 太郎" },
          battingStats: [
            {
              season: 2024,
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
            name: "テスト 太郎",
            kana: "テスト タロウ",
            isActive: true,
          },
          links: { self: "/players/test-player.json" },
        },
      ]);
      expect(await readPlayerDocuments(temporaryDirectory)).toEqual([enriched]);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
