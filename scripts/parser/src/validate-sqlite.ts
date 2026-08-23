import fs from "node:fs";
import path from "node:path";
import { DEFAULT_RAW_SQLITE_PATH } from "./constants.js";
import { readRawCounts } from "./publish-counts.js";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const dbPath = path.resolve(
  process.cwd(),
  option("--db") ?? DEFAULT_RAW_SQLITE_PATH,
);
if (!fs.existsSync(dbPath)) {
  throw new Error(`SQLite file not found: ${dbPath}`);
}

const { players, runs } = readRawCounts(dbPath);
if (players < 1) throw new Error("raw SQLite contains no players");
if (runs < 1) throw new Error("raw SQLite contains no scrape runs");

console.log(
  `raw SQLite is valid: ${players} players, ${runs} scrape runs (${dbPath})`,
);

// Optional: also drop the counts as JSON so a later CI step (building the
// `metadata.json` published alongside `raw.sqlite` on the GitHub Pages site)
// can reuse this validation run instead of opening the SQLite file a second
// time.
const jsonOut = option("--json-out");
if (jsonOut) {
  const jsonOutPath = path.resolve(process.cwd(), jsonOut);
  fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
  fs.writeFileSync(
    jsonOutPath,
    `${JSON.stringify({ players, runs }, null, 2)}\n`,
  );
  console.log(`Wrote counts to ${jsonOutPath}`);
}
