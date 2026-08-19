import path from "node:path";
import {
  calculateSnapshot,
  type RawPlayer,
  readSnapshot,
  writeSnapshot,
} from "@repo/baseball-data";
import {
  DEFAULT_DERIVED_JSON_PATH,
  DEFAULT_RAW_JSON_PATH,
} from "./constants.js";

function getOption(args: string[], flag: string, fallback: string): string {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputPath = path.resolve(
    process.cwd(),
    getOption(args, "--input", DEFAULT_RAW_JSON_PATH),
  );
  const outputPath = path.resolve(
    process.cwd(),
    getOption(args, "--output", DEFAULT_DERIVED_JSON_PATH),
  );
  const snapshot = await readSnapshot<RawPlayer>(inputPath);
  const enriched = calculateSnapshot(snapshot);
  await writeSnapshot(outputPath, enriched);
  console.log(`Calculated stats for ${enriched.players.length} players`);
  console.log(`Saved derived JSON to ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
