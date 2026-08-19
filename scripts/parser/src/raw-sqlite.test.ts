import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RawPlayer } from "@repo/baseball-data";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { writeRawPlayersToSqlite } from "./raw-sqlite.js";

const player: RawPlayer = {
  id: "test-player",
  playerUrl: "https://npb.jp/bis/players/123.html",
  playerName: "テスト 太郎",
  kanaName: "テスト タロウ",
  isActive: true,
  detailInfo: { ポジション: "内野手" },
  battingStats: [{ 年度: "2024", 安打: "10" }],
  pitchingStats: [],
};

describe("writeRawPlayersToSqlite", () => {
  it("stores the exact scrape payload in a run-scoped SQLite database", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "baseball-stats-raw-sqlite-"),
    );
    const dbPath = path.join(temporaryDirectory, "raw.sqlite");

    try {
      const result = writeRawPlayersToSqlite([player], dbPath, "run-1");
      expect(result).toEqual({ runId: "run-1", players: 1 });

      const db = new Database(dbPath, { readonly: true });
      expect(db.prepare("select * from scrape_runs").get()).toMatchObject({
        id: "run-1",
        source: "npb.jp",
        player_count: 1,
      });
      const row = db.prepare("select * from raw_players").get() as {
        payload_json: string;
      };
      expect(JSON.parse(row.payload_json)).toEqual(player);
      db.close();
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
