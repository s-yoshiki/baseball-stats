import BetterSqlite3 from "better-sqlite3";

export type PublishedCounts = {
  players: number;
  battingRows: number;
  pitchingRows: number;
};

/**
 * Opens the published SQLite read-only, checks its integrity, and returns
 * row counts for the tables that describe how much data it contains. Shared
 * by `validate-sqlite` and `build-release-metadata` so both report the same
 * numbers from a single query implementation.
 */
export function readPublishedCounts(dbPath: string): PublishedCounts {
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
      db.prepare("SELECT COUNT(*) AS count FROM players").get() as {
        count: number;
      }
    ).count;
    const battingRows = (
      db.prepare("SELECT COUNT(*) AS count FROM batting_stats").get() as {
        count: number;
      }
    ).count;
    const pitchingRows = (
      db.prepare("SELECT COUNT(*) AS count FROM pitching_stats").get() as {
        count: number;
      }
    ).count;

    return { players, battingRows, pitchingRows };
  } finally {
    db.close();
  }
}
