import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseInnings, parseSeason, round, toNumber } from "./parse-values.js";
import { parsePlayerDetails } from "./player-details.js";
import { parsePlayerName } from "./player-name.js";
import { calculatePlayerStats } from "./stats.js";
import type {
  BattingStatRow,
  BattingTotals,
  ComputedBattingSeason,
  ComputedPitchingSeason,
  EnrichedPlayer,
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
    innings: round(parseInnings(row.投球回)),
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
        season: parseSeason(row),
        team: row.所属球団?.trim() || null,
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
    年度: stringValue(stat.season),
    所属球団: stat.team ?? "",
    試合: stringValue(totals.games),
    打席: stringValue(totals.plateAppearances),
    打数: stringValue(totals.atBats),
    得点: stringValue(totals.runs),
    安打: stringValue(totals.hits),
    二塁打: stringValue(totals.doubles),
    三塁打: stringValue(totals.triples),
    本塁打: stringValue(totals.homeRuns),
    塁打: stringValue(totals.totalBases),
    打点: stringValue(totals.rbi),
    盗塁: stringValue(totals.steals),
    盗塁刺: stringValue(totals.caughtStealing),
    犠打: stringValue(totals.sacrificeHits),
    犠飛: stringValue(totals.sacrificeFlies),
    四球: stringValue(totals.walks),
    死球: stringValue(totals.hitByPitch),
    三振: stringValue(totals.strikeouts),
    併殺打: stringValue(totals.groundedIntoDoublePlays),
    打率: stringValue(stat.metrics.battingAverage),
    出塁率: stringValue(stat.metrics.onBasePercentage),
    長打率: stringValue(stat.metrics.sluggingPercentage),
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
    年度: stringValue(stat.season),
    所属球団: stat.team ?? "",
    登板: stringValue(totals.games),
    勝利: stringValue(totals.wins),
    敗北: stringValue(totals.losses),
    セーブ: stringValue(totals.saves),
    ホールド: stringValue(totals.holds),
    HP: stringValue(totals.holdPoints),
    完投: stringValue(totals.completeGames),
    完封勝: stringValue(totals.shutouts),
    無四球: stringValue(totals.noWalkCompleteGames),
    勝率: stringValue(totals.winningPercentage),
    打者: stringValue(totals.battersFaced),
    投球回: rawInnings,
    安打: stringValue(totals.hitsAllowed),
    本塁打: stringValue(totals.homeRunsAllowed),
    四球: stringValue(totals.walksAllowed),
    死球: stringValue(totals.hitByPitch),
    奪三振: stringValue(totals.strikeouts),
    暴投: stringValue(totals.wildPitches),
    ボーク: stringValue(totals.balks),
    失点: stringValue(totals.runsAllowed),
    自責点: stringValue(totals.earnedRuns),
    防御率: stringValue(stat.metrics.era),
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
  const rawBatting = rawRows(raw.battingStats ?? attributes.battingStats);
  const rawPitching = rawRows(raw.pitchingStats ?? attributes.pitchingStats);
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
