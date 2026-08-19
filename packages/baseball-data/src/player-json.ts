import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseInnings, parseSeason, toNumber } from "./parse-values.js";
import type {
  BattingTotals,
  ComputedBattingSeason,
  ComputedPitchingSeason,
  EnrichedPlayer,
  PitchingTotals,
  PlayerApiAttributes,
  PlayerApiBattingStat,
  PlayerApiDocument,
  PlayerApiIndexDocument,
  PlayerApiPitchingStat,
} from "./types.js";

function writeValue<T>(value: T): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, writeValue(value));
  await rename(temporaryPath, filePath);
}

function battingTotals(
  row: EnrichedPlayer["battingStats"][number],
): BattingTotals {
  return {
    games: toNumber(row.試合),
    plateAppearances: toNumber(row.打席),
    atBats: toNumber(row.打数),
    runs: toNumber(row.得点),
    hits: toNumber(row.安打),
    doubles: toNumber(row.二塁打),
    triples: toNumber(row.三塁打),
    homeRuns: toNumber(row.本塁打),
    totalBases: toNumber(row.塁打),
    rbi: toNumber(row.打点),
    steals: toNumber(row.盗塁),
    caughtStealing: toNumber(row.盗塁刺),
    sacrificeHits: toNumber(row.犠打),
    sacrificeFlies: toNumber(row.犠飛),
    walks: toNumber(row.四球),
    hitByPitch: toNumber(row.死球),
    strikeouts: toNumber(row.三振),
    groundedIntoDoublePlays: toNumber(row.併殺打),
  };
}

function pitchingTotals(
  row: EnrichedPlayer["pitchingStats"][number],
): PitchingTotals {
  return {
    games: toNumber(row.登板),
    wins: toNumber(row.勝利),
    losses: toNumber(row.敗北),
    saves: toNumber(row.セーブ),
    holds: toNumber(row.ホールド ?? row.H),
    holdPoints: toNumber(row.HP),
    completeGames: toNumber(row.完投),
    shutouts: toNumber(row.完封勝),
    noWalkCompleteGames: toNumber(row.無四球),
    winningPercentage: toNumber(row.勝率),
    battersFaced: toNumber(row.打者),
    innings: parseInnings(row.投球回),
    hitsAllowed: toNumber(row.安打),
    homeRunsAllowed: toNumber(row.本塁打),
    walksAllowed: toNumber(row.四球),
    hitByPitch: toNumber(row.死球),
    strikeouts: toNumber(row.奪三振 ?? row.三振),
    wildPitches: toNumber(row.暴投),
    balks: toNumber(row.ボーク),
    runsAllowed: toNumber(row.失点),
    earnedRuns: toNumber(row.自責点),
  };
}

function battingMetrics(value: ComputedBattingSeason) {
  return {
    battingAverage: value.battingAverage,
    onBasePercentage: value.onBasePercentage,
    sluggingPercentage: value.sluggingPercentage,
    ops: value.ops,
    iso: value.iso,
    walkPercentage: value.walkPercentage,
    strikeoutPercentage: value.strikeoutPercentage,
  };
}

function pitchingMetrics(value: ComputedPitchingSeason) {
  return {
    era: value.era,
    whip: value.whip,
    strikeoutsPerNine: value.strikeoutsPerNine,
    walksPerNine: value.walksPerNine,
    strikeoutToWalkRatio: value.strikeoutToWalkRatio,
  };
}

function createAttributes(player: EnrichedPlayer): PlayerApiAttributes {
  return {
    profile: {
      name: player.playerName,
      kana: player.kanaName,
      url: player.playerUrl,
      isActive: player.isActive,
      details: player.detailInfo,
    },
    battingStats: player.battingStats.map((row, index) => {
      const computed = player.computedStats.batting[index];
      if (!computed) {
        throw new Error(
          `Missing batting metrics for ${player.id} row ${index}`,
        );
      }
      return {
        season: parseSeason(row),
        team: row.所属球団?.trim() || null,
        raw: row,
        totals: battingTotals(row),
        metrics: battingMetrics(computed),
      } satisfies PlayerApiBattingStat;
    }),
    pitchingStats: player.pitchingStats.map((row, index) => {
      const computed = player.computedStats.pitching[index];
      if (!computed) {
        throw new Error(
          `Missing pitching metrics for ${player.id} row ${index}`,
        );
      }
      return {
        season: parseSeason(row),
        team: row.所属球団?.trim() || null,
        raw: row,
        totals: pitchingTotals(row),
        metrics: pitchingMetrics(computed),
      } satisfies PlayerApiPitchingStat;
    }),
    career: player.computedStats.career,
  };
}

export function toPlayerApiDocument(
  player: EnrichedPlayer,
  generatedAt = new Date().toISOString(),
): PlayerApiDocument {
  return {
    schemaVersion: 2,
    data: {
      type: "player",
      id: player.id,
      attributes: createAttributes(player),
      links: {
        self: `/players/${player.id}.json`,
      },
    },
    meta: {
      source: {
        name: "npb.jp",
        url: player.playerUrl,
      },
      generatedAt,
    },
  };
}

function fromDocument(document: PlayerApiDocument): EnrichedPlayer {
  const profile = document.data.attributes.profile;
  const battingStats = document.data.attributes.battingStats;
  const pitchingStats = document.data.attributes.pitchingStats;

  return {
    id: document.data.id,
    playerUrl: profile.url,
    playerName: profile.name,
    kanaName: profile.kana,
    isActive: profile.isActive,
    detailInfo: profile.details,
    battingStats: battingStats.map((row) => row.raw),
    pitchingStats: pitchingStats.map((row) => row.raw),
    computedStats: {
      batting: battingStats.map((row) => ({
        season: row.season,
        team: row.team,
        ...row.metrics,
      })),
      pitching: pitchingStats.map((row) => ({
        season: row.season,
        team: row.team,
        ...row.metrics,
      })),
      career: document.data.attributes.career,
    },
  };
}

export async function writePlayerDocuments(
  outputDir: string,
  players: EnrichedPlayer[],
  generatedAt = new Date().toISOString(),
): Promise<void> {
  const documents = players.map((player) =>
    toPlayerApiDocument(player, generatedAt),
  );
  await mkdir(outputDir, { recursive: true });

  for (const document of documents) {
    await writeJsonFile(
      path.join(outputDir, `${document.data.id}.json`),
      document,
    );
  }

  const index: PlayerApiIndexDocument = {
    schemaVersion: 2,
    data: documents
      .map((document) => ({
        type: "player" as const,
        id: document.data.id,
        attributes: {
          name: document.data.attributes.profile.name,
          kana: document.data.attributes.profile.kana,
          isActive: document.data.attributes.profile.isActive,
        },
        links: document.data.links,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    meta: {
      source: {
        name: "npb.jp",
        url: "https://npb.jp/bis/players/",
      },
      generatedAt,
    },
  };
  await writeJsonFile(path.join(outputDir, "index.json"), index);
}

export async function readPlayerDocuments(
  inputDir: string,
): Promise<EnrichedPlayer[]> {
  const entries = await readdir(inputDir, { withFileTypes: true });
  const fileNames = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".json") &&
        entry.name !== "index.json",
    )
    .map((entry) => entry.name)
    .sort();

  const players: EnrichedPlayer[] = [];
  for (const fileName of fileNames) {
    const filePath = path.join(inputDir, fileName);
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { schemaVersion?: unknown }).schemaVersion !== 2
    ) {
      throw new Error(`Unsupported player document: ${filePath}`);
    }
    players.push(fromDocument(parsed as PlayerApiDocument));
  }
  return players;
}
