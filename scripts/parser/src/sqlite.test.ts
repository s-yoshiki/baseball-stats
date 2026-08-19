import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  calculatePlayerStats,
  createSnapshot,
  type RawPlayer,
  type ScrapedPlayer,
} from "@repo/baseball-data";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { writeRawPlayersToSqlite } from "./raw-sqlite.js";
import { writeRawSqliteToSqlite, writeSnapshotToSqlite } from "./sqlite.js";

const player: RawPlayer = {
  id: "test-player",
  playerUrl: "https://npb.jp/bis/players/123.html",
  playerName: "テスト 太郎",
  kanaName: "テスト タロウ",
  isActive: true,
  detailInfo: { 所属球団: "福岡ソフトバンク" },
  battingStats: [
    {
      season: "2024",
      team: "福岡ソフトバンク",
      plateAppearances: "30",
      hits: "10",
      atBats: "30",
    },
  ],
  pitchingStats: [],
};

const scrapedPlayer: ScrapedPlayer = {
  id: "test-player",
  playerUrl: "https://npb.jp/bis/players/123.html",
  playerName: "テスト 太郎",
  kanaName: "テスト タロウ",
  isActive: true,
  detailInfo: { ポジション: "内野手" },
  battingStats: [
    {
      年度: "2024",
      所属球団: "福岡ソフトバンク",
      打席: "30",
      安打: "10",
      打数: "30",
    },
  ],
  pitchingStats: [],
};

describe("writeSnapshotToSqlite", () => {
  it("writes an enriched snapshot to SQLite", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "baseball-stats-"),
    );
    const dbPath = path.join(temporaryDirectory, "data.sqlite");

    try {
      const snapshot = createSnapshot("calculate", [
        calculatePlayerStats(player),
      ]);
      const result = await writeSnapshotToSqlite(snapshot, dbPath);

      expect(result).toEqual({ players: 1, battingRows: 1, pitchingRows: 0 });
      const db = new Database(dbPath, { readonly: true });
      expect(db.prepare("select count(*) as count from players").get()).toEqual(
        { count: 1 },
      );
      expect(
        db.prepare("select ops, batting_average from batting_stats").get(),
      ).toMatchObject({ batting_average: 0.333, ops: 0.333 });
      expect(
        db.prepare("select team_id, league_id from batting_stats").get(),
      ).toEqual({ team_id: "hawks", league_id: "pacific" });
      expect(db.prepare("select count(*) as count from leagues").get()).toEqual(
        { count: 3 },
      );
      db.close();
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

describe("writeRawSqliteToSqlite", () => {
  it("builds the published database from the latest raw run", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "baseball-stats-raw-to-sqlite-"),
    );
    const rawDbPath = path.join(temporaryDirectory, "raw.sqlite");
    const dbPath = path.join(temporaryDirectory, "data.sqlite");

    try {
      await writeRawPlayersToSqlite([scrapedPlayer], rawDbPath, "run-1");
      const result = await writeRawSqliteToSqlite(
        rawDbPath,
        dbPath,
        path.resolve(process.cwd(), "../../data/masters"),
      );

      expect(result).toEqual({ players: 1, battingRows: 1, pitchingRows: 0 });
      const db = new Database(dbPath, { readonly: true });
      expect(db.prepare("select player_name from players").get()).toEqual({
        player_name: "テスト 太郎",
      });
      expect(db.prepare("select hits from batting_stats").get()).toEqual({
        hits: 10,
      });
      db.close();
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
