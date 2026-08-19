import fs from "node:fs";
import path from "node:path";
import {
  calculatePlayerStats,
  type EnrichedPlayer,
  type EnrichedSnapshot,
  type RawPlayer,
  readSnapshot,
} from "@repo/baseball-data";
import { DEFAULT_DERIVED_JSON_PATH, DEFAULT_SQLITE_PATH } from "./constants.js";
import { writeSnapshotToSqlite } from "./sqlite.js";

function getOption(args: string[], flag: string, fallback: string): string {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

function enrichSnapshot(
  snapshot: EnrichedSnapshot | { players: RawPlayer[] },
): EnrichedSnapshot {
  return {
    schemaVersion: 1,
    pipeline: "calculate",
    generatedAt: new Date().toISOString(),
    source: {
      name: "npb.jp",
      url: "https://npb.jp/bis/players/",
    },
    players: snapshot.players.map((player) =>
      "computedStats" in player
        ? (player as EnrichedPlayer)
        : calculatePlayerStats(player),
    ),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputPath = path.resolve(
    process.cwd(),
    getOption(args, "--input", DEFAULT_DERIVED_JSON_PATH),
  );
  const dbPath = path.resolve(
    process.cwd(),
    getOption(args, "--db", DEFAULT_SQLITE_PATH),
  );
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const snapshot = await readSnapshot<RawPlayer | EnrichedPlayer>(inputPath);
  const enriched = enrichSnapshot(snapshot);
  const result = await writeSnapshotToSqlite(enriched, dbPath);
  console.log(
    `Wrote ${result.players} players, ${result.battingRows} batting rows, and ${result.pitchingRows} pitching rows to ${dbPath}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
