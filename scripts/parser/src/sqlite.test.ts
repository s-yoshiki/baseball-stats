import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  calculatePlayerStats,
  createSnapshot,
  type RawPlayer,
} from "@repo/baseball-data";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { writeSnapshotToSqlite } from "./sqlite.js";

const player: RawPlayer = {
  id: "test-player",
  playerUrl: "https://npb.jp/bis/players/123.html",
  playerName: "テスト 太郎",
  kanaName: "テスト タロウ",
  isActive: true,
  detailInfo: { 所属球団: "テスト" },
  battingStats: [{ 年度: "2024", 打席: "30", 安打: "10", 打数: "30" }],
  pitchingStats: [],
};

describe("writeSnapshotToSqlite", () => {
  it("writes an enriched snapshot to SQLite", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "baseball-stats-"),
    );
    const dbPath = path.join(temporaryDirectory, "baseball.sqlite");

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
      db.close();
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
