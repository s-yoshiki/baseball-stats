import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseInnings, parseSeason, toNumber } from "./parse-values.js";
import { parsePlayerDetails } from "./player-details.js";
import { parsePlayerName } from "./player-name.js";
import type {
  BattingTotals,
  ComputedBattingSeason,
  ComputedPitchingSeason,
  EnrichedPlayer,
  FieldProvenance,
  PitchingTotals,
  PlayerApiAttributes,
  PlayerApiBattingStat,
  PlayerApiDocument,
  PlayerApiIndexDocument,
  PlayerApiPitchingStat,
  PlayerDetails,
  PlayerSource,
} from "./types.js";

type LegacyMeta = {
  source?: { name: string; url: string };
  generatedAt?: string;
};

type LegacyPlayerApiDocument = {
  schemaVersion?: number;
  data: {
    type: "player";
    id: string;
    attributes: {
      profile: {
        name: string;
        kana: string;
        url: string;
        isActive: boolean;
        details: Record<string, string>;
      };
      battingStats: PlayerApiBattingStat[];
      pitchingStats: PlayerApiPitchingStat[];
      career: PlayerApiAttributes["career"];
    };
    links: { self: string };
  };
  meta: LegacyMeta;
};

const NPB_SOURCE_ID = "npb";
const COMPUTED_SOURCE_ID = "baseball-stats";

function createSources(
  player: EnrichedPlayer,
  generatedAt: string,
): PlayerSource[] {
  const defaults: PlayerSource[] = [
    {
      id: NPB_SOURCE_ID,
      kind: "official",
      name: "NPB公式サイト",
      url: player.playerUrl,
      retrievedAt: generatedAt,
    },
    {
      id: COMPUTED_SOURCE_ID,
      kind: "computed",
      name: "baseball-stats",
      retrievedAt: generatedAt,
    },
  ];
  const customSources = (player.sources ?? []).filter(
    (source) => source.id !== NPB_SOURCE_ID && source.id !== COMPUTED_SOURCE_ID,
  );
  const sources = new Map(
    [...defaults, ...customSources].map((source) => [source.id, source]),
  );
  return [...sources.values()];
}

function createProvenance(
  player: EnrichedPlayer,
  generatedAt: string,
): Record<string, FieldProvenance> {
  const normalized = (note?: string): FieldProvenance => ({
    sourceId: NPB_SOURCE_ID,
    method: "normalized",
    updatedAt: generatedAt,
    ...(note ? { note } : {}),
  });
  const scraped = (note?: string): FieldProvenance => ({
    sourceId: NPB_SOURCE_ID,
    method: "scraped",
    updatedAt: generatedAt,
    ...(note ? { note } : {}),
  });
  const calculated = (note?: string): FieldProvenance => ({
    sourceId: COMPUTED_SOURCE_ID,
    method: "calculated",
    updatedAt: generatedAt,
    ...(note ? { note } : {}),
  });

  const provenance: Record<string, FieldProvenance> = {
    "profile.familyName": normalized(),
    "profile.givenName": normalized(),
    "profile.familyNameKana": normalized(),
    "profile.givenNameKana": normalized(),
    "profile.registeredName": normalized(),
    "profile.registeredNameKana": normalized(),
    "profile.url": scraped(),
    "profile.isActive": scraped(),
    "profile.details": normalized(),
    "profile.rawDetails.npb": scraped(),
    career: calculated(),
  };

  for (const [index] of player.battingStats.entries()) {
    const sourceId = player.statSourceIds?.batting[index] ?? NPB_SOURCE_ID;
    provenance[`battingStats[${index}].raw`] =
      sourceId === NPB_SOURCE_ID
        ? scraped()
        : {
            sourceId,
            method: "imported",
            updatedAt: generatedAt,
          };
    provenance[`battingStats[${index}].totals`] = {
      sourceId,
      method: "normalized",
      updatedAt: generatedAt,
    };
    provenance[`battingStats[${index}].metrics`] = calculated();
  }
  for (const [index] of player.pitchingStats.entries()) {
    const sourceId = player.statSourceIds?.pitching[index] ?? NPB_SOURCE_ID;
    provenance[`pitchingStats[${index}].raw`] =
      sourceId === NPB_SOURCE_ID
        ? scraped()
        : {
            sourceId,
            method: "imported",
            updatedAt: generatedAt,
          };
    provenance[`pitchingStats[${index}].totals`] = {
      sourceId,
      method: "normalized",
      updatedAt: generatedAt,
    };
    provenance[`pitchingStats[${index}].metrics`] = calculated();
  }
  const generatedKeys = new Set(Object.keys(provenance));
  const preservedProvenance = Object.fromEntries(
    Object.entries(player.provenance ?? {}).filter(([key, value]) => {
      if (!generatedKeys.has(key)) return true;
      return (
        value.sourceId !== NPB_SOURCE_ID &&
        value.sourceId !== COMPUTED_SOURCE_ID
      );
    }),
  );
  return { ...provenance, ...preservedProvenance };
}

function createMeta(
  player: EnrichedPlayer,
  generatedAt: string,
): PlayerApiDocument["meta"] {
  return {
    sources: createSources(player, generatedAt),
    provenance: createProvenance(player, generatedAt),
    generatedAt,
  };
}

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
  const name = parsePlayerName(player.playerName, player.kanaName);
  const details =
    player.profileDetails ?? parsePlayerDetails(player.detailInfo);
  const rawDetails = player.sourceDetails ?? {
    [NPB_SOURCE_ID]: player.detailInfo,
  };

  return {
    profile: {
      ...name,
      url: player.playerUrl,
      isActive: player.isActive,
      details,
      rawDetails,
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
        sourceId: player.statSourceIds?.batting[index] ?? NPB_SOURCE_ID,
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
        sourceId: player.statSourceIds?.pitching[index] ?? NPB_SOURCE_ID,
        raw: row,
        totals: pitchingTotals(row),
        metrics: pitchingMetrics(computed),
      } satisfies PlayerApiPitchingStat;
    }),
    career: player.computedStats.career,
  };
}

function composeSourceName(
  registeredName: string,
  familyName: string | null,
  givenName: string | null,
  separator: string,
): string {
  const nameForParts = [familyName, givenName].filter(Boolean).join(separator);
  const normalizedRegisteredName = registeredName
    .split(/[・･\s]+/)
    .filter(Boolean)
    .join(separator);
  if (
    !nameForParts ||
    nameForParts === registeredName ||
    nameForParts === normalizedRegisteredName
  ) {
    return registeredName;
  }
  return `${registeredName}（${nameForParts}）`;
}

export function toPlayerApiDocument(
  player: EnrichedPlayer,
  generatedAt = new Date().toISOString(),
): PlayerApiDocument {
  return {
    data: {
      type: "player",
      id: player.id,
      attributes: createAttributes(player),
      links: {
        self: `/players/${player.id}.json`,
      },
    },
    meta: createMeta(player, generatedAt),
  };
}

function fromDocument(document: PlayerApiDocument): EnrichedPlayer {
  const profile = document.data.attributes.profile;
  const battingStats = document.data.attributes.battingStats;
  const pitchingStats = document.data.attributes.pitchingStats;

  return {
    id: document.data.id,
    playerUrl: profile.url,
    playerName: composeSourceName(
      profile.registeredName,
      profile.familyName,
      profile.givenName,
      " ",
    ),
    kanaName: composeSourceName(
      profile.registeredNameKana,
      profile.familyNameKana,
      profile.givenNameKana,
      "・",
    ),
    isActive: profile.isActive,
    detailInfo:
      profile.rawDetails[NPB_SOURCE_ID] ??
      Object.values(profile.rawDetails)[0] ??
      {},
    profileDetails: profile.details,
    sourceDetails: profile.rawDetails,
    sources: document.meta.sources,
    provenance: document.meta.provenance,
    battingStats: battingStats.map((row) => row.raw),
    pitchingStats: pitchingStats.map((row) => row.raw),
    statSourceIds: {
      batting: battingStats.map((row) => row.sourceId),
      pitching: pitchingStats.map((row) => row.sourceId),
    },
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

function migrateLegacyDocument(
  document: LegacyPlayerApiDocument,
): PlayerApiDocument {
  const legacyProfile = document.data.attributes.profile;
  const name = parsePlayerName(legacyProfile.name, legacyProfile.kana);

  return {
    data: {
      ...document.data,
      attributes: {
        ...document.data.attributes,
        profile: {
          ...name,
          url: legacyProfile.url,
          isActive: legacyProfile.isActive,
          details: parsePlayerDetails(legacyProfile.details),
          rawDetails: { [NPB_SOURCE_ID]: legacyProfile.details },
        },
      },
    },
    meta: {
      sources: [
        {
          id: NPB_SOURCE_ID,
          kind: "official",
          name: document.meta.source?.name ?? "NPB公式サイト",
          ...(document.meta.source?.url
            ? { url: document.meta.source.url }
            : {}),
        },
      ],
      provenance: {},
      generatedAt: document.meta.generatedAt ?? "unknown",
    },
  };
}

function isPlayerDetails(value: unknown): value is PlayerDetails {
  if (!value || typeof value !== "object") {
    return false;
  }
  const details = value as {
    birthDate?: unknown;
    career?: unknown;
    draft?: unknown;
  };
  return Boolean(
    details.birthDate &&
      typeof details.birthDate === "object" &&
      details.career &&
      typeof details.career === "object" &&
      details.draft &&
      typeof details.draft === "object",
  );
}

function isFlatRawDetails(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "string");
}

function isRawDetailsBySource(
  value: unknown,
): value is Record<string, Record<string, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => isFlatRawDetails(entry));
}

function normalizeRawDetails(
  rawDetails: unknown,
  details: unknown,
): Record<string, Record<string, string>> {
  if (isRawDetailsBySource(rawDetails) && Object.keys(rawDetails).length > 0) {
    return rawDetails;
  }
  if (isFlatRawDetails(rawDetails)) {
    return { [NPB_SOURCE_ID]: rawDetails };
  }
  if (isFlatRawDetails(details)) {
    return { [NPB_SOURCE_ID]: details };
  }
  return {};
}

function primaryRawDetails(
  rawDetails: Record<string, Record<string, string>>,
): Record<string, string> {
  return rawDetails[NPB_SOURCE_ID] ?? Object.values(rawDetails)[0] ?? {};
}

function normalizeMeta(
  meta: unknown,
  playerUrl: string,
): PlayerApiDocument["meta"] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return {
      sources: [
        {
          id: NPB_SOURCE_ID,
          kind: "official",
          name: "NPB公式サイト",
          url: playerUrl,
        },
      ],
      provenance: {},
      generatedAt: "unknown",
    };
  }
  const candidate = meta as {
    sources?: unknown;
    provenance?: unknown;
    generatedAt?: unknown;
    source?: { name?: unknown; url?: unknown };
  };
  if (
    Array.isArray(candidate.sources) &&
    candidate.sources.every((source) => source && typeof source === "object") &&
    candidate.provenance &&
    typeof candidate.provenance === "object" &&
    typeof candidate.generatedAt === "string"
  ) {
    return meta as PlayerApiDocument["meta"];
  }
  return {
    sources: [
      {
        id: NPB_SOURCE_ID,
        kind: "official",
        name:
          typeof candidate.source?.name === "string"
            ? candidate.source.name
            : "NPB公式サイト",
        url:
          typeof candidate.source?.url === "string"
            ? candidate.source.url
            : playerUrl,
      },
    ],
    provenance: {},
    generatedAt:
      typeof candidate.generatedAt === "string"
        ? candidate.generatedAt
        : "unknown",
  };
}

function migrateCurrentDocument(
  document: PlayerApiDocument,
): PlayerApiDocument {
  const profile = document.data.attributes
    .profile as PlayerApiAttributes["profile"] & {
    rawDetails?: unknown;
    details: unknown;
  };
  const rawDetails = normalizeRawDetails(profile.rawDetails, profile.details);
  const primaryDetails = primaryRawDetails(rawDetails);
  const details = isPlayerDetails(profile.details)
    ? profile.details
    : parsePlayerDetails(primaryDetails);

  return {
    ...document,
    data: {
      ...document.data,
      attributes: {
        ...document.data.attributes,
        profile: {
          ...profile,
          details,
          rawDetails,
        },
      },
    },
    meta: normalizeMeta(document.meta, profile.url),
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
    data: documents
      .map((document) => ({
        type: "player" as const,
        id: document.data.id,
        attributes: {
          familyName: document.data.attributes.profile.familyName,
          givenName: document.data.attributes.profile.givenName,
          familyNameKana: document.data.attributes.profile.familyNameKana,
          givenNameKana: document.data.attributes.profile.givenNameKana,
          registeredName: document.data.attributes.profile.registeredName,
          registeredNameKana:
            document.data.attributes.profile.registeredNameKana,
          isActive: document.data.attributes.profile.isActive,
        },
        links: document.data.links,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    meta: {
      sources: [
        {
          id: NPB_SOURCE_ID,
          kind: "official",
          name: "NPB公式サイト",
          url: "https://npb.jp/bis/players/",
          retrievedAt: generatedAt,
        },
        {
          id: COMPUTED_SOURCE_ID,
          kind: "computed",
          name: "baseball-stats",
          retrievedAt: generatedAt,
        },
      ],
      provenance: {},
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
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Unsupported player document: ${filePath}`);
    }
    const profile = (
      parsed as {
        data?: { attributes?: { profile?: Record<string, unknown> } };
      }
    ).data?.attributes?.profile;
    if (!profile) {
      throw new Error(`Unsupported player document: ${filePath}`);
    }
    if (typeof profile.registeredName === "string") {
      players.push(
        fromDocument(migrateCurrentDocument(parsed as PlayerApiDocument)),
      );
      continue;
    }
    if (typeof profile.name === "string" && typeof profile.kana === "string") {
      players.push(
        fromDocument(migrateLegacyDocument(parsed as LegacyPlayerApiDocument)),
      );
      continue;
    }
    throw new Error(`Unsupported player document: ${filePath}`);
  }
  return players;
}
