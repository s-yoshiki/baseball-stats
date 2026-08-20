import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  normalizeBattingStat,
  normalizePitchingStat,
} from "./normalize-player.js";
import { parseInnings, round, toNumber } from "./parse-values.js";
import { parsePlayerDetails } from "./player-details.js";
import { parsePlayerName } from "./player-name.js";
import { calculatePlayerStats } from "./stats.js";
import type {
  BattingStatRow,
  BattingTotals,
  ComputedBattingSeason,
  ComputedPitchingSeason,
  EnrichedPlayer,
  NpbBattingStatRow,
  NpbPitchingStatRow,
  PitchingStatRow,
  PitchingTotals,
  PlayerApiAttributes,
  PlayerApiBattingStat,
  PlayerApiDocument,
  PlayerApiIndexDocument,
  PlayerApiPitchingStat,
  PlayerDetails,
  RawPlayer,
} from "./types.js";

type UnknownRecord = Record<string, unknown>;

function writeValue(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, writeValue(value));
  await rename(temporaryPath, filePath);
}

function stringValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function battingTotals(
  row: EnrichedPlayer["battingStats"][number],
): BattingTotals {
  return {
    games: toNumber(row.games),
    plateAppearances: toNumber(row.plateAppearances),
    atBats: toNumber(row.atBats),
    runs: toNumber(row.runs),
    hits: toNumber(row.hits),
    doubles: toNumber(row.doubles),
    triples: toNumber(row.triples),
    homeRuns: toNumber(row.homeRuns),
    totalBases: toNumber(row.totalBases),
    rbi: toNumber(row.rbi),
    steals: toNumber(row.steals),
    caughtStealing: toNumber(row.caughtStealing),
    sacrificeHits: toNumber(row.sacrificeHits),
    sacrificeFlies: toNumber(row.sacrificeFlies),
    walks: toNumber(row.walks),
    hitByPitch: toNumber(row.hitByPitch),
    strikeouts: toNumber(row.strikeouts),
    groundedIntoDoublePlays: toNumber(row.groundedIntoDoublePlays),
  };
}

function pitchingTotals(
  row: EnrichedPlayer["pitchingStats"][number],
): PitchingTotals {
  return {
    games: toNumber(row.games),
    wins: toNumber(row.wins),
    losses: toNumber(row.losses),
    saves: toNumber(row.saves),
    holds: toNumber(row.holds),
    holdPoints: toNumber(row.holdPoints),
    completeGames: toNumber(row.completeGames),
    shutouts: toNumber(row.shutouts),
    noWalkCompleteGames: toNumber(row.noWalkCompleteGames),
    winningPercentage: toNumber(row.winningPercentage),
    battersFaced: toNumber(row.battersFaced),
    innings: round(parseInnings(row.innings)),
    hitsAllowed: toNumber(row.hitsAllowed),
    homeRunsAllowed: toNumber(row.homeRunsAllowed),
    walksAllowed: toNumber(row.walksAllowed),
    hitByPitch: toNumber(row.hitByPitch),
    strikeouts: toNumber(row.strikeouts),
    wildPitches: toNumber(row.wildPitches),
    balks: toNumber(row.balks),
    runsAllowed: toNumber(row.runsAllowed),
    earnedRuns: toNumber(row.earnedRuns),
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
    babip: value.babip,
    stolenBaseSuccessPercentage: value.stolenBaseSuccessPercentage,
    homeRunPercentage: value.homeRunPercentage,
    extraBaseHitPercentage: value.extraBaseHitPercentage,
    runsPerPlateAppearance: value.runsPerPlateAppearance,
    rbiPerPlateAppearance: value.rbiPerPlateAppearance,
    walkToStrikeoutRatio: value.walkToStrikeoutRatio,
  };
}

function pitchingMetrics(value: ComputedPitchingSeason) {
  return {
    winningPercentage: value.winningPercentage,
    era: value.era,
    whip: value.whip,
    strikeoutsPerNine: value.strikeoutsPerNine,
    walksPerNine: value.walksPerNine,
    strikeoutToWalkRatio: value.strikeoutToWalkRatio,
    hitsPerNine: value.hitsPerNine,
    homeRunsPerNine: value.homeRunsPerNine,
    runsPerNine: value.runsPerNine,
    strikeoutPercentage: value.strikeoutPercentage,
    walkPercentage: value.walkPercentage,
    strikeoutMinusWalkPercentage: value.strikeoutMinusWalkPercentage,
  };
}

function createAttributes(player: EnrichedPlayer): PlayerApiAttributes {
  const name = parsePlayerName(player.playerName, player.kanaName);
  const details =
    player.profileDetails ?? parsePlayerDetails(player.detailInfo);

  return {
    profile: {
      ...name,
      url: player.playerUrl,
      isActive: player.isActive,
      details,
    },
    battingStats: player.battingStats.map((row, index) => {
      const computed = player.computedStats.batting[index];
      if (!computed) {
        throw new Error(
          `Missing batting metrics for ${player.id} row ${index}`,
        );
      }
      return {
        season: toNumber(row.season),
        team: row.team?.trim() || null,
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
        season: toNumber(row.season),
        team: row.team?.trim() || null,
        totals: pitchingTotals(row),
        metrics: pitchingMetrics(computed),
      } satisfies PlayerApiPitchingStat;
    }),
    career: player.computedStats.career,
  };
}

export function toPlayerApiDocument(player: EnrichedPlayer): PlayerApiDocument {
  return {
    data: {
      type: "player",
      id: player.id,
      attributes: createAttributes(player),
      links: {
        self: `/players/${player.id}.json`,
      },
    },
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRawRow(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

function rawRows(value: unknown): Array<Record<string, string>> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!isRecord(row)) return [];
    if (isRawRow(row)) return [row];
    return isRawRow(row.raw) ? [row.raw] : [];
  });
}

function rawDetails(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  if (isRawRow(value)) return value;
  if (isRawRow(value.npb)) return value.npb;
  return {};
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

function detailsToRaw(details: PlayerDetails): Record<string, string> {
  const result: Record<string, string> = {};
  if (details.position) result.ポジション = details.position;
  if (details.throws || details.bats) {
    result.投打 = `${details.throws ?? ""}投${details.bats ?? ""}打`;
  }
  if (details.heightCm !== null || details.weightKg !== null) {
    result["身長／体重"] =
      `${stringValue(details.heightCm)}cm／${stringValue(details.weightKg)}kg`;
  }
  if (details.birthDate.iso) {
    const { year, month, day } = details.birthDate;
    result.生年月日 = `${year}年${month}月${day}日`;
  }
  if (details.career.raw) result.経歴 = details.career.raw;
  if (details.draft.raw) result.ドラフト = details.draft.raw;
  return result;
}

function battingStatToRaw(stat: PlayerApiBattingStat): BattingStatRow {
  const totals = stat.totals;
  return {
    season: stringValue(stat.season),
    team: stat.team ?? "",
    games: stringValue(totals.games),
    plateAppearances: stringValue(totals.plateAppearances),
    atBats: stringValue(totals.atBats),
    runs: stringValue(totals.runs),
    hits: stringValue(totals.hits),
    doubles: stringValue(totals.doubles),
    triples: stringValue(totals.triples),
    homeRuns: stringValue(totals.homeRuns),
    totalBases: stringValue(totals.totalBases),
    rbi: stringValue(totals.rbi),
    steals: stringValue(totals.steals),
    caughtStealing: stringValue(totals.caughtStealing),
    sacrificeHits: stringValue(totals.sacrificeHits),
    sacrificeFlies: stringValue(totals.sacrificeFlies),
    walks: stringValue(totals.walks),
    hitByPitch: stringValue(totals.hitByPitch),
    strikeouts: stringValue(totals.strikeouts),
    groundedIntoDoublePlays: stringValue(totals.groundedIntoDoublePlays),
    battingAverage: stringValue(stat.metrics.battingAverage),
    onBasePercentage: stringValue(stat.metrics.onBasePercentage),
    sluggingPercentage: stringValue(stat.metrics.sluggingPercentage),
  };
}

function pitchingStatToRaw(stat: PlayerApiPitchingStat): PitchingStatRow {
  const totals = stat.totals;
  const innings = totals.innings;
  let rawInnings = "";
  if (innings !== null) {
    const wholeInnings = Math.floor(innings);
    const fractionalInnings = innings - wholeInnings;
    if (Math.abs(fractionalInnings - 1 / 3) < 0.01) {
      rawInnings = `${wholeInnings}.1`;
    } else if (Math.abs(fractionalInnings - 2 / 3) < 0.01) {
      rawInnings = `${wholeInnings}.2`;
    } else {
      rawInnings = String(innings);
    }
  }
  return {
    season: stringValue(stat.season),
    team: stat.team ?? "",
    games: stringValue(totals.games),
    wins: stringValue(totals.wins),
    losses: stringValue(totals.losses),
    saves: stringValue(totals.saves),
    holds: stringValue(totals.holds),
    holdPoints: stringValue(totals.holdPoints),
    completeGames: stringValue(totals.completeGames),
    shutouts: stringValue(totals.shutouts),
    noWalkCompleteGames: stringValue(totals.noWalkCompleteGames),
    winningPercentage: stringValue(totals.winningPercentage),
    battersFaced: stringValue(totals.battersFaced),
    innings: rawInnings,
    hitsAllowed: stringValue(totals.hitsAllowed),
    homeRunsAllowed: stringValue(totals.homeRunsAllowed),
    walksAllowed: stringValue(totals.walksAllowed),
    hitByPitch: stringValue(totals.hitByPitch),
    strikeouts: stringValue(totals.strikeouts),
    wildPitches: stringValue(totals.wildPitches),
    balks: stringValue(totals.balks),
    runsAllowed: stringValue(totals.runsAllowed),
    earnedRuns: stringValue(totals.earnedRuns),
    era: stringValue(stat.metrics.era),
  };
}

function apiStatsToRaw(
  attributes: PlayerApiAttributes,
): Pick<RawPlayer, "battingStats" | "pitchingStats"> {
  return {
    battingStats: attributes.battingStats.map(battingStatToRaw),
    pitchingStats: attributes.pitchingStats.map(pitchingStatToRaw),
  };
}

function documentToRawPlayer(document: PlayerApiDocument): RawPlayer {
  const profile = document.data.attributes.profile;
  const details = profile.details;
  const name = composeSourceName(
    profile.registeredName,
    profile.familyName,
    profile.givenName,
    " ",
  );
  const kana = composeSourceName(
    profile.registeredNameKana,
    profile.familyNameKana,
    profile.givenNameKana,
    "・",
  );
  const stats = apiStatsToRaw(document.data.attributes);

  return {
    id: document.data.id,
    playerUrl: profile.url,
    playerName: name,
    kanaName: kana,
    isActive: profile.isActive,
    detailInfo: detailsToRaw(details),
    profileDetails: details,
    ...stats,
  };
}

function normalizeStat<
  TStat extends PlayerApiBattingStat | PlayerApiPitchingStat,
>(value: unknown): TStat {
  const stat = isRecord(value) ? value : {};
  return {
    season: typeof stat.season === "number" ? stat.season : null,
    team: typeof stat.team === "string" ? stat.team : null,
    totals: isRecord(stat.totals) ? stat.totals : {},
    metrics: isRecord(stat.metrics) ? stat.metrics : {},
  } as TStat;
}

function normalizeDocument(value: unknown): PlayerApiDocument {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error("Unsupported player document");
  }
  const data = value.data;
  const attributes = isRecord(data.attributes) ? data.attributes : {};
  const originalProfile = isRecord(attributes.profile)
    ? attributes.profile
    : {};
  const rawProfile =
    isRecord(value.raw) && isRecord(value.raw.profile) ? value.raw.profile : {};
  const rawProfileDetails = rawDetails(
    originalProfile.rawDetails ?? rawProfile.details,
  );
  const oldName =
    typeof originalProfile.name === "string" ? originalProfile.name : "";
  const oldKana =
    typeof originalProfile.kana === "string" ? originalProfile.kana : "";
  const parsedName = parsePlayerName(oldName, oldKana);
  const registeredName =
    typeof originalProfile.registeredName === "string"
      ? originalProfile.registeredName
      : parsedName.registeredName;
  const registeredNameKana =
    typeof originalProfile.registeredNameKana === "string"
      ? originalProfile.registeredNameKana
      : parsedName.registeredNameKana;
  const details = isPlayerDetails(originalProfile.details)
    ? originalProfile.details
    : parsePlayerDetails(rawProfileDetails);
  const battingStats = Array.isArray(attributes.battingStats)
    ? attributes.battingStats.map((stat) =>
        normalizeStat<PlayerApiBattingStat>(stat),
      )
    : [];
  const pitchingStats = Array.isArray(attributes.pitchingStats)
    ? attributes.pitchingStats.map((stat) =>
        normalizeStat<PlayerApiPitchingStat>(stat),
      )
    : [];
  const url =
    typeof originalProfile.url === "string"
      ? originalProfile.url
      : typeof rawProfile.url === "string"
        ? rawProfile.url
        : "";
  const isActive =
    typeof originalProfile.isActive === "boolean"
      ? originalProfile.isActive
      : Boolean(rawProfile.isActive);
  const id = typeof data.id === "string" ? data.id : "";

  return {
    data: {
      type: "player",
      id,
      attributes: {
        profile: {
          familyName:
            typeof originalProfile.familyName === "string"
              ? originalProfile.familyName
              : parsedName.familyName,
          givenName:
            typeof originalProfile.givenName === "string"
              ? originalProfile.givenName
              : parsedName.givenName,
          familyNameKana:
            typeof originalProfile.familyNameKana === "string"
              ? originalProfile.familyNameKana
              : parsedName.familyNameKana,
          givenNameKana:
            typeof originalProfile.givenNameKana === "string"
              ? originalProfile.givenNameKana
              : parsedName.givenNameKana,
          registeredName,
          registeredNameKana,
          url,
          isActive,
          details,
        },
        battingStats,
        pitchingStats,
        career: isRecord(attributes.career)
          ? attributes.career
          : { batting: {}, pitching: {} },
      } as PlayerApiAttributes,
      links: {
        self:
          isRecord(data.links) && typeof data.links.self === "string"
            ? data.links.self
            : `/players/${id}.json`,
      },
    },
  };
}

function mergeRecords(
  base: UnknownRecord,
  patch: UnknownRecord,
): UnknownRecord {
  const result: UnknownRecord = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const current = result[key];
    result[key] =
      isRecord(current) && isRecord(value)
        ? mergeRecords(current, value)
        : value;
  }
  return result;
}

function overrideAttributes(value: unknown): UnknownRecord {
  if (!isRecord(value)) return {};
  if (isRecord(value.data) && isRecord(value.data.attributes)) {
    return value.data.attributes;
  }
  if (isRecord(value.attributes)) return value.attributes;
  return value;
}

function applyPlayerOverride(
  document: PlayerApiDocument,
  override: unknown,
): PlayerApiDocument {
  return {
    data: {
      ...document.data,
      attributes: mergeRecords(
        document.data.attributes,
        overrideAttributes(override),
      ) as PlayerApiAttributes,
    },
  };
}

async function readPlayerOverride(
  overridesDir: string,
  playerId: string,
): Promise<unknown | null> {
  try {
    return JSON.parse(
      await readFile(path.join(overridesDir, `${playerId}.json`), "utf8"),
    ) as unknown;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

function isPlayerDetails(value: unknown): value is PlayerDetails {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.birthDate) && isRecord(value.career) && isRecord(value.draft)
  );
}

function normalizedBattingRows(value: unknown): BattingStatRow[] {
  return rawRows(value).map((row) => {
    if ("season" in row) return row as BattingStatRow;
    return normalizeBattingStat(row as NpbBattingStatRow);
  });
}

function normalizedPitchingRows(value: unknown): PitchingStatRow[] {
  return rawRows(value).map((row) => {
    if ("season" in row) return row as PitchingStatRow;
    return normalizePitchingStat(row as NpbPitchingStatRow);
  });
}

function extractRawPlayer(
  value: unknown,
  document: PlayerApiDocument,
): RawPlayer | null {
  if (!isRecord(value) || !isRecord(value.data)) return null;
  const attributes = isRecord(value.data.attributes)
    ? value.data.attributes
    : {};
  const profile = isRecord(attributes.profile) ? attributes.profile : {};
  const raw = isRecord(value.raw) ? value.raw : {};
  const rawProfile = isRecord(raw.profile) ? raw.profile : {};
  const rawBatting = normalizedBattingRows(
    raw.battingStats ?? attributes.battingStats,
  );
  const rawPitching = normalizedPitchingRows(
    raw.pitchingStats ?? attributes.pitchingStats,
  );
  const parsed = documentToRawPlayer(document);
  const details = rawDetails(profile.rawDetails ?? rawProfile.details);
  if (
    !rawBatting.length &&
    !rawPitching.length &&
    !Object.keys(details).length
  ) {
    return null;
  }
  return {
    ...parsed,
    playerName:
      typeof rawProfile.name === "string" ? rawProfile.name : parsed.playerName,
    kanaName:
      typeof rawProfile.kana === "string" ? rawProfile.kana : parsed.kanaName,
    playerUrl:
      typeof rawProfile.url === "string" ? rawProfile.url : parsed.playerUrl,
    isActive:
      typeof rawProfile.isActive === "boolean"
        ? rawProfile.isActive
        : parsed.isActive,
    detailInfo: Object.keys(details).length ? details : parsed.detailInfo,
    battingStats: rawBatting.length ? rawBatting : parsed.battingStats,
    pitchingStats: rawPitching.length ? rawPitching : parsed.pitchingStats,
  };
}

export async function writePlayerDocuments(
  outputDir: string,
  players: EnrichedPlayer[],
  overridesDir?: string,
): Promise<void> {
  const documents: PlayerApiDocument[] = [];
  for (const player of players) {
    const document = toPlayerApiDocument(player);
    const override = overridesDir
      ? await readPlayerOverride(overridesDir, player.id)
      : null;
    documents.push(
      override ? applyPlayerOverride(document, override) : document,
    );
  }
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
    const document = normalizeDocument(parsed);
    if (!document.data.id) {
      throw new Error(`Player document has no id: ${filePath}`);
    }
    const rawPlayer =
      extractRawPlayer(parsed, document) ?? documentToRawPlayer(document);
    players.push(calculatePlayerStats(rawPlayer));
  }
  return players;
}
