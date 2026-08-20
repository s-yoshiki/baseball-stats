import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_MASTER_DATA_DIR,
  DEFAULT_RAW_SQLITE_PATH,
  DEFAULT_SQLITE_PATH,
} from "./constants.js";
import { openRawSqliteWriter, readKnownPlayerIds } from "./raw-sqlite.js";
import { type ScrapeOptions, scrapePlayers } from "./scrape.js";
import { writeRawSqliteToSqlite } from "./sqlite.js";

type CliOptions = ScrapeOptions & {
  db: string;
  mastersDir: string;
  rawDb: string;
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
    scope: "active",
    db: DEFAULT_SQLITE_PATH,
    mastersDir: DEFAULT_MASTER_DATA_DIR,
    rawDb: DEFAULT_RAW_SQLITE_PATH,
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
  --scope daily|active|all
                        daily: active + newly indexed players; active or all otherwise (default: active)
  --limit <number>      scrape only the first N players
  --kana-limit <number> scrape only the first N kana index pages
  --delay <ms>          wait between requests (default: 300)
  --raw-db <path>       raw scrape SQLite path (default: ${DEFAULT_RAW_SQLITE_PATH})
  --db <path>           generated application SQLite path (default: ${DEFAULT_SQLITE_PATH})
  --masters-dir <path>  master data directory (default: ${DEFAULT_MASTER_DATA_DIR})
  --debug               print progress and row counts`);
      process.exit(0);
    }
    if (arg === "--debug") {
      options.debug = true;
      continue;
    }
    if (arg === "--include-retired" || (arg === "--scope" && next === "all")) {
      options.scope = "all";
      if (arg === "--scope") {
        index += 1;
      }
      continue;
    }
    if (arg === "--active-only" || (arg === "--scope" && next === "active")) {
      options.scope = "active";
      if (arg === "--scope") {
        index += 1;
      }
      continue;
    }
    if (arg === "--scope" && next === "daily") {
      options.scope = "daily";
      index += 1;
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
    if (arg === "--raw-db" && next) {
      options.rawDb = next;
      index += 1;
      continue;
    }
    if (arg === "--db" && next) {
      options.db = next;
      index += 1;
      continue;
    }
    if (arg === "--masters-dir" && next) {
      options.mastersDir = next;
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  return options;
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const options = readCliOptions(args);
  const rawDbPath = path.resolve(process.cwd(), options.rawDb);
  let knownPlayerIds: ReadonlySet<string> | undefined;
  if (options.scope === "daily" && fs.existsSync(rawDbPath)) {
    try {
      knownPlayerIds = await readKnownPlayerIds(rawDbPath);
    } catch (error) {
      const incompatiblePath = `${rawDbPath}.incompatible-${Date.now()}`;
      fs.renameSync(rawDbPath, incompatiblePath);
      console.warn(
        `Existing raw SQLite is incompatible and was moved to ${incompatiblePath}. Starting a full daily baseline.`,
        error,
      );
      knownPlayerIds = new Set();
    }
  }
  const writer = await openRawSqliteWriter(rawDbPath);
  let rawResult: Awaited<ReturnType<typeof writer.finish>>;
  try {
    await scrapePlayers({ ...options, knownPlayerIds }, writer.writePlayer);
    rawResult = await writer.finish();
  } finally {
    await writer.close();
  }
  const dbPath = path.resolve(process.cwd(), options.db);
  const mastersDir = path.resolve(process.cwd(), options.mastersDir);
  const sqliteResult = await writeRawSqliteToSqlite(
    rawDbPath,
    dbPath,
    mastersDir,
  );
  console.log(
    `Saved raw scrape run ${rawResult.runId} (${rawResult.players} players) to ${rawDbPath}`,
  );
  console.log(
    `Wrote ${sqliteResult.players} players, ${sqliteResult.battingRows} batting rows, and ${sqliteResult.pitchingRows} pitching rows to ${dbPath}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
