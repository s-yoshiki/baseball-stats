import fs from "node:fs";
import path from "node:path";
import { readPublishedCounts } from "./publish-counts.js";

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

const { players, battingRows, pitchingRows } = readPublishedCounts(dbPath);
if (players < 1) throw new Error("SQLite snapshot contains no players");

console.log(
  `SQLite is valid: ${players} players, ${battingRows} batting rows, ${pitchingRows} pitching rows (${dbPath})`,
);

// Optional: also drop the row counts as JSON so a later CI step (building
// the published `metadata.json` for the GitHub Pages site) can reuse this
// validation run instead of opening the SQLite file a second time.
const jsonOut = option("--json-out");
if (jsonOut) {
  const jsonOutPath = path.resolve(process.cwd(), jsonOut);
  fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
  fs.writeFileSync(
    jsonOutPath,
    `${JSON.stringify({ players, battingRows, pitchingRows }, null, 2)}\n`,
  );
  console.log(`Wrote row counts to ${jsonOutPath}`);
}
