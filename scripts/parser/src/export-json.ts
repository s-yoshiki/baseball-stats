import path from "node:path";
import {
  calculatePlayerStats,
  writePlayerDocuments,
} from "@repo/baseball-data";
import {
  DEFAULT_EXPORT_PLAYER_DATA_DIR,
  DEFAULT_RAW_SQLITE_PATH,
} from "./constants.js";
import { readLatestRawPlayers } from "./raw-sqlite.js";

function getOption(args: string[], flag: string, fallback: string): string {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const rawDbPath = path.resolve(
    process.cwd(),
    getOption(args, "--raw-db", DEFAULT_RAW_SQLITE_PATH),
  );
  const outputDir = path.resolve(
    process.cwd(),
    getOption(args, "--output-dir", DEFAULT_EXPORT_PLAYER_DATA_DIR),
  );
  const players = (await readLatestRawPlayers(rawDbPath)).map(
    calculatePlayerStats,
  );
  await writePlayerDocuments(outputDir, players);
  console.log(
    `Exported ${players.length} player JSON documents to ${outputDir}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
