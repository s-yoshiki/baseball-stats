import fs from "node:fs";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const dbPath = path.resolve(
  process.cwd(),
  option("--db") ?? "../../data/sqlite/data.sqlite",
);
if (!fs.existsSync(dbPath)) {
  throw new Error(`SQLite file not found: ${dbPath}`);
}

const db = new BetterSqlite3(dbPath, { readonly: true, fileMustExist: true });
try {
  const integrity = db.pragma("integrity_check", { simple: true });
  if (integrity !== "ok")
    throw new Error(`SQLite integrity check failed: ${integrity}`);

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
  if (players < 1) throw new Error("SQLite snapshot contains no players");

  console.log(
    `SQLite is valid: ${players} players, ${battingRows} batting rows, ${pitchingRows} pitching rows (${dbPath})`,
  );
} finally {
  db.close();
}
