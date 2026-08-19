import path from "node:path";
import {
  calculatePlayerStats,
  type EnrichedPlayer,
  type RawPlayer,
  readPlayerDocuments,
  readSnapshot,
  writePlayerDocuments,
} from "@repo/baseball-data";
import {
  DEFAULT_PLAYER_DATA_DIR,
  DEFAULT_PLAYER_OVERRIDES_DIR,
} from "./constants.js";

function getOption(
  args: string[],
  flag: string,
  fallback?: string,
): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outputDir = path.resolve(
    process.cwd(),
    getOption(args, "--output-dir") ??
      getOption(args, "--output", DEFAULT_PLAYER_DATA_DIR) ??
      DEFAULT_PLAYER_DATA_DIR,
  );
  const legacyInput = getOption(args, "--input");
  const overridesDir = path.resolve(
    process.cwd(),
    getOption(args, "--overrides-dir", DEFAULT_PLAYER_OVERRIDES_DIR) ??
      DEFAULT_PLAYER_OVERRIDES_DIR,
  );

  let players: EnrichedPlayer[];
  if (legacyInput) {
    const inputPath = path.resolve(process.cwd(), legacyInput);
    const snapshot = await readSnapshot<RawPlayer | EnrichedPlayer>(inputPath);
    players = snapshot.players.map((player) =>
      "computedStats" in player ? player : calculatePlayerStats(player),
    );
  } else {
    const inputDir = path.resolve(
      process.cwd(),
      getOption(args, "--input-dir", DEFAULT_PLAYER_DATA_DIR) ??
        DEFAULT_PLAYER_DATA_DIR,
    );
    const existingPlayers = await readPlayerDocuments(inputDir);
    players = existingPlayers.map(calculatePlayerStats);
  }

  await writePlayerDocuments(outputDir, players, overridesDir);
  console.log(`Calculated stats for ${players.length} players`);
  console.log(`Saved player documents to ${outputDir}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
