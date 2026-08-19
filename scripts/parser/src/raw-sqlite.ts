import fs from "node:fs";
import path from "node:path";
import type { RawPlayer } from "@repo/baseball-data";
import BetterSqlite3 from "better-sqlite3";

export type RawSqliteResult = {
  runId: string;
  players: number;
};

function createRunId(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, "");
}

export function writeRawPlayersToSqlite(
  players: RawPlayer[],
  dbPath: string,
  runId = createRunId(),
): RawSqliteResult {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new BetterSqlite3(dbPath);

  try {
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS scrape_runs (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        player_count INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS raw_players (
        run_id TEXT NOT NULL REFERENCES scrape_runs(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL,
        player_url TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        PRIMARY KEY (run_id, player_id)
      );

      CREATE INDEX IF NOT EXISTS idx_raw_players_player
        ON raw_players(player_id);
    `);

    const timestamp = new Date().toISOString();
    const insertRun = db.prepare(`
      INSERT INTO scrape_runs (id, source, started_at, completed_at, player_count)
      VALUES (@id, @source, @startedAt, @completedAt, @playerCount)
    `);
    const insertPlayer = db.prepare(`
      INSERT INTO raw_players (run_id, player_id, player_url, payload_json)
      VALUES (@runId, @playerId, @playerUrl, @payload)
    `);

    const write = db.transaction(() => {
      insertRun.run({
        id: runId,
        source: "npb.jp",
        startedAt: timestamp,
        completedAt: timestamp,
        playerCount: players.length,
      });
      for (const player of players) {
        insertPlayer.run({
          runId,
          playerId: player.id,
          playerUrl: player.playerUrl,
          payload: JSON.stringify(player),
        });
      }
    });
    write();
    return { runId, players: players.length };
  } finally {
    db.close();
  }
}
