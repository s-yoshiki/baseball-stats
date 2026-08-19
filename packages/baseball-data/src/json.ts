import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DataPipeline, DataSnapshot } from "./types.js";

export async function readSnapshot<TPlayer>(
  filePath: string,
): Promise<DataSnapshot<TPlayer>> {
  const content = await readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(content);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Invalid snapshot: ${filePath}`);
  }

  const snapshot = parsed as Partial<DataSnapshot<TPlayer>>;
  if (!Array.isArray(snapshot.players)) {
    throw new Error(`Unsupported snapshot format: ${filePath}`);
  }
  return snapshot as DataSnapshot<TPlayer>;
}

export async function writeSnapshot<TPlayer>(
  filePath: string,
  snapshot: DataSnapshot<TPlayer>,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporaryPath, filePath);
}

export function createSnapshot<TPlayer>(
  pipeline: DataPipeline,
  players: TPlayer[],
): DataSnapshot<TPlayer> {
  return {
    pipeline,
    generatedAt: new Date().toISOString(),
    source: {
      name: "npb.jp",
      url: "https://npb.jp/bis/players/",
    },
    players,
  };
}
