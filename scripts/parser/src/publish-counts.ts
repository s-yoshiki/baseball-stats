import BetterSqlite3 from "better-sqlite3";

export type RawCounts = {
  players: number;
  runs: number;
};

/**
 * Opens the raw scrape SQLite read-only, checks its integrity, and returns
 * counts that describe how much data it contains: the number of distinct
 * players across all scrape runs, and the number of scrape runs recorded.
 * Shared by `validate-sqlite` and `build-release-metadata` so both report
 * the same numbers from a single query implementation.
 */
export function readRawCounts(dbPath: string): RawCounts {
  const db = new BetterSqlite3(dbPath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    const integrity = db.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") {
      throw new Error(`SQLite integrity check failed: ${integrity}`);
    }

    const players = (
      db
        .prepare("SELECT COUNT(DISTINCT player_id) AS count FROM raw_players")
        .get() as { count: number }
    ).count;
    const runs = (
      db.prepare("SELECT COUNT(*) AS count FROM scrape_runs").get() as {
        count: number;
      }
    ).count;

    return { players, runs };
  } finally {
    db.close();
  }
}
