import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ScrapedPlayer } from "@repo/baseball-data";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
  openRawSqliteWriter,
  readKnownPlayerIds,
  readLatestRawPlayers,
  writeRawPlayersToSqlite,
} from "./raw-sqlite.js";

const player: ScrapedPlayer = {
  id: "test-player",
  playerUrl: "https://npb.jp/bis/players/123.html",
  playerName: "テスト 太郎",
  kanaName: "テスト タロウ",
  isActive: true,
  detailInfo: {
    ポジション: "内野手",
    投打: "右投左打",
    備考: "取得時の追加項目",
  },
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
      const result = await writeRawPlayersToSqlite([player], dbPath, "run-1");
      expect(result).toEqual({ runId: "run-1", players: 1 });

      const db = new Database(dbPath, { readonly: true });
      expect(db.prepare("select * from scrape_runs").get()).toMatchObject({
        id: "run-1",
        source: "npb.jp",
        player_count: 1,
      });
      const row = db.prepare("select * from raw_players").get() as {
        profile_json: string;
        batting_stats_json: string;
        pitching_stats_json: string;
      };
      expect(JSON.parse(row.profile_json)).toEqual({
        position: "内野手",
        batsThrows: "右投左打",
        heightWeight: null,
        birthDate: null,
        career: null,
        draft: null,
        additional: [{ sourceKey: "備考", value: "取得時の追加項目" }],
      });
      expect(JSON.parse(row.batting_stats_json)).toEqual([
        { season: "2024", hits: "10" },
      ]);
      expect(JSON.parse(row.pitching_stats_json)).toEqual([]);
      db.close();
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

describe("openRawSqliteWriter", () => {
  it("persists each player before marking the scrape run complete", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "baseball-stats-streaming-raw-sqlite-"),
    );
    const dbPath = path.join(temporaryDirectory, "raw.sqlite");
    const writer = await openRawSqliteWriter(dbPath, "run-streaming");

    try {
      await writer.writePlayer(player);
      const db = new Database(dbPath, { readonly: true });
      expect(
        db.prepare("select count(*) as count from raw_players").get(),
      ).toEqual({ count: 1 });
      expect(db.prepare("select completed_at from scrape_runs").get()).toEqual({
        completed_at: null,
      });
      db.close();
      await expect(readLatestRawPlayers(dbPath)).rejects.toThrow(
        "No scrape runs found",
      );

      await expect(writer.finish()).resolves.toEqual({
        runId: "run-streaming",
        players: 1,
      });
      await expect(readLatestRawPlayers(dbPath)).resolves.toHaveLength(1);
    } finally {
      await writer.close();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

describe("completed raw scrape runs", () => {
  it("uses the newest row for each player across incremental runs", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "baseball-stats-incremental-raw-sqlite-"),
    );
    const dbPath = path.join(temporaryDirectory, "raw.sqlite");
    const updatedPlayer = { ...player, playerName: "更新 テスト 太郎" };

    try {
      await writeRawPlayersToSqlite([player], dbPath, "run-1");
      await writeRawPlayersToSqlite([updatedPlayer], dbPath, "run-2");

      await expect(readKnownPlayerIds(dbPath)).resolves.toEqual(
        new Set(["test-player"]),
      );
      await expect(readLatestRawPlayers(dbPath)).resolves.toMatchObject([
        { id: "test-player", playerName: "更新 テスト 太郎" },
      ]);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
