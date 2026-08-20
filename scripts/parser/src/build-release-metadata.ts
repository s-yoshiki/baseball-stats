import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_RELEASE_COUNTS_PATH,
  DEFAULT_RELEASE_METADATA_PATH,
} from "./constants.js";
import type { PublishedCounts } from "./publish-counts.js";
import { buildReleaseMetadata } from "./release-metadata.js";

function requireOption(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

// Reads the row counts written by `validate-sqlite --json-out` so this
// script never opens the SQLite file itself: the counts it reports are
// guaranteed to come from the snapshot that was just validated.
const countsPath = path.resolve(
  process.cwd(),
  option("--counts") ?? DEFAULT_RELEASE_COUNTS_PATH,
);
if (!fs.existsSync(countsPath)) {
  throw new Error(
    `Counts file not found: ${countsPath} (run validate-sqlite with --json-out first)`,
  );
}
const counts = JSON.parse(
  fs.readFileSync(countsPath, "utf8"),
) as PublishedCounts;

const outPath = path.resolve(
  process.cwd(),
  option("--out") ?? DEFAULT_RELEASE_METADATA_PATH,
);

const metadata = buildReleaseMetadata(counts, {
  sourceSha: requireOption("--source-sha"),
  sourceRunId: Number(requireOption("--source-run-id")),
  scope: requireOption("--scope"),
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(metadata, null, 2)}\n`);
console.log(`Wrote release metadata to ${outPath}`);
