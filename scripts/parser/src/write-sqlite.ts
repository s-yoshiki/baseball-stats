import fs from "node:fs";
import path from "node:path";
import {
  type EnrichedPlayer,
  type EnrichedSnapshot,
  readPlayerDocuments,
} from "@repo/baseball-data";
import {
  DEFAULT_MASTER_DATA_DIR,
  DEFAULT_PLAYER_DATA_DIR,
  DEFAULT_SQLITE_PATH,
} from "./constants.js";
import { writeSnapshotToSqlite } from "./sqlite.js";

function getOption(args: string[], flag: string, fallback: string): string {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

function createSnapshot(players: EnrichedPlayer[]): EnrichedSnapshot {
  return {
    schemaVersion: 1,
    pipeline: "calculate",
    generatedAt: new Date().toISOString(),
    source: {
      name: "npb.jp",
      url: "https://npb.jp/bis/players/",
    },
    players,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputPath = path.resolve(
    process.cwd(),
    getOption(
      args,
      "--input-dir",
      getOption(args, "--input", DEFAULT_PLAYER_DATA_DIR),
    ),
  );
  const dbPath = path.resolve(
    process.cwd(),
    getOption(args, "--db", DEFAULT_SQLITE_PATH),
  );
  const masterPath = path.resolve(
    process.cwd(),
    getOption(args, "--masters-dir", DEFAULT_MASTER_DATA_DIR),
  );
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const players = await readPlayerDocuments(inputPath);
  const result = await writeSnapshotToSqlite(
    createSnapshot(players),
    dbPath,
    masterPath,
  );
  console.log(
    `Wrote ${result.players} players, ${result.battingRows} batting rows, and ${result.pitchingRows} pitching rows to ${dbPath}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
