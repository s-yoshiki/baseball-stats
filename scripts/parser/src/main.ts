import path from "node:path";
import {
  calculatePlayerStats,
  writePlayerDocuments,
} from "@repo/baseball-data";
import { DEFAULT_PLAYER_DATA_DIR } from "./constants.js";
import { type ScrapeOptions, scrapePlayers } from "./scrape.js";

type CliOptions = ScrapeOptions & {
  outputDir: string;
};

function parseNumber(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative integer`);
  }
  return parsed;
}

export function readCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    debug: false,
    delayMs: 300,
    includeRetired: false,
    outputDir: DEFAULT_PLAYER_DATA_DIR,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--") {
      continue;
    }
    if (arg === "--help") {
      console.log(`Usage: pnpm scrape -- [options]

Options:
  --scope active|all    scrape active players or all players (default: active)
  --limit <number>      scrape only the first N players
  --kana-limit <number> scrape only the first N kana index pages
  --delay <ms>          wait between requests (default: 300)
  --output-dir <path>   player JSON directory (default: ${DEFAULT_PLAYER_DATA_DIR})
  --debug               print progress and row counts`);
      process.exit(0);
    }
    if (arg === "--debug") {
      options.debug = true;
      continue;
    }
    if (arg === "--include-retired" || (arg === "--scope" && next === "all")) {
      options.includeRetired = true;
      if (arg === "--scope") {
        index += 1;
      }
      continue;
    }
    if (arg === "--active-only" || (arg === "--scope" && next === "active")) {
      options.includeRetired = false;
      if (arg === "--scope") {
        index += 1;
      }
      continue;
    }
    if (arg === "--limit" && next) {
      options.limit = parseNumber(next, "--limit");
      index += 1;
      continue;
    }
    if (arg === "--kana-limit" && next) {
      options.kanaLimit = parseNumber(next, "--kana-limit");
      index += 1;
      continue;
    }
    if (arg === "--delay" && next) {
      options.delayMs = parseNumber(next, "--delay");
      index += 1;
      continue;
    }
    if ((arg === "--output-dir" || arg === "--output") && next) {
      options.outputDir = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  return options;
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const options = readCliOptions(args);
  const players = await scrapePlayers(options);
  const enrichedPlayers = players.map(calculatePlayerStats);
  const outputDir = path.resolve(process.cwd(), options.outputDir);
  await writePlayerDocuments(outputDir, enrichedPlayers);
  console.log(`Saved ${players.length} player documents to ${outputDir}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
