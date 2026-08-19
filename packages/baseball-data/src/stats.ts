import {
  addNullable,
  parseInnings,
  parseSeason,
  ratio,
  round,
  subtractNullable,
  toNumber,
} from "./parse-values.js";
import type {
  ComputedBattingCareer,
  ComputedBattingSeason,
  ComputedPitchingCareer,
  ComputedPitchingSeason,
  EnrichedPlayer,
  PlayerComputedStats,
  RawPlayer,
} from "./types.js";

function sum(values: Array<number | null>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function calculateBattingCareer(
  rows: RawPlayer["battingStats"],
): ComputedBattingCareer {
  const games = sum(rows.map((row) => toNumber(row.試合)));
  const plateAppearances = sum(rows.map((row) => toNumber(row.打席)));
  const atBats = sum(rows.map((row) => toNumber(row.打数)));
  const runs = sum(rows.map((row) => toNumber(row.得点)));
  const hits = sum(rows.map((row) => toNumber(row.安打)));
  const doubles = sum(rows.map((row) => toNumber(row.二塁打)));
  const triples = sum(rows.map((row) => toNumber(row.三塁打)));
  const homeRuns = sum(rows.map((row) => toNumber(row.本塁打)));
  const totalBases = sum(rows.map((row) => toNumber(row.塁打)));
  const rbi = sum(rows.map((row) => toNumber(row.打点)));
  const steals = sum(rows.map((row) => toNumber(row.盗塁)));
  const walks = sum(rows.map((row) => toNumber(row.四球)));
  const hitByPitch = sum(rows.map((row) => toNumber(row.死球)));
  const strikeouts = sum(rows.map((row) => toNumber(row.三振)));
  const battingAverage = ratio(hits, atBats);
  const onBasePercentage = ratio(hits + walks + hitByPitch, plateAppearances);
  const sluggingPercentage = ratio(totalBases, atBats);

  return {
    seasons: rows.filter((row) => parseSeason(row) !== null).length,
    games,
    plateAppearances,
    atBats,
    runs,
    hits,
    doubles,
    triples,
    homeRuns,
    totalBases,
    rbi,
    steals,
    walks,
    hitByPitch,
    strikeouts,
    battingAverage,
    onBasePercentage,
    sluggingPercentage,
    ops: addNullable(onBasePercentage, sluggingPercentage),
    iso: subtractNullable(sluggingPercentage, battingAverage),
  };
}

function calculatePitchingCareer(
  rows: RawPlayer["pitchingStats"],
): ComputedPitchingCareer {
  const games = sum(rows.map((row) => toNumber(row.登板)));
  const wins = sum(rows.map((row) => toNumber(row.勝利)));
  const losses = sum(rows.map((row) => toNumber(row.敗北)));
  const saves = sum(rows.map((row) => toNumber(row.セーブ)));
  const holds = sum(rows.map((row) => toNumber(row.ホールド ?? row.H)));
  const innings = sum(rows.map((row) => parseInnings(row.投球回)));
  const hitsAllowed = sum(rows.map((row) => toNumber(row.安打)));
  const walksAllowed = sum(rows.map((row) => toNumber(row.四球)));
  const strikeouts = sum(rows.map((row) => toNumber(row.奪三振 ?? row.三振)));
  const earnedRuns = sum(rows.map((row) => toNumber(row.自責点)));
  const decisions = wins + losses;

  return {
    seasons: rows.filter((row) => parseSeason(row) !== null).length,
    games,
    wins,
    losses,
    saves,
    holds,
    innings: round(innings, 3) ?? 0,
    hitsAllowed,
    walksAllowed,
    strikeouts,
    earnedRuns,
    winningPercentage: ratio(wins, decisions),
    era: innings > 0 ? round((earnedRuns * 9) / innings) : null,
    whip: innings > 0 ? round((hitsAllowed + walksAllowed) / innings) : null,
    strikeoutsPerNine: innings > 0 ? round((strikeouts * 9) / innings) : null,
    walksPerNine: innings > 0 ? round((walksAllowed * 9) / innings) : null,
    strikeoutToWalkRatio: ratio(strikeouts, walksAllowed),
  };
}

function calculateBattingSeason(
  row: RawPlayer["battingStats"][number],
): ComputedBattingSeason {
  const plateAppearances = toNumber(row.打席) ?? 0;
  const atBats = toNumber(row.打数) ?? 0;
  const hits = toNumber(row.安打) ?? 0;
  const walks = toNumber(row.四球) ?? 0;
  const hitByPitch = toNumber(row.死球) ?? 0;
  const strikeouts = toNumber(row.三振) ?? 0;
  const battingAverage = toNumber(row.打率) ?? ratio(hits, atBats);
  const onBasePercentage =
    toNumber(row.出塁率) ?? ratio(hits + walks + hitByPitch, plateAppearances);
  const sluggingPercentage =
    toNumber(row.長打率) ?? ratio(toNumber(row.塁打) ?? 0, atBats);

  return {
    season: parseSeason(row),
    team: text(row.所属球団),
    battingAverage,
    onBasePercentage,
    sluggingPercentage,
    ops: addNullable(onBasePercentage, sluggingPercentage),
    iso: subtractNullable(sluggingPercentage, battingAverage),
    walkPercentage: ratio(walks, plateAppearances),
    strikeoutPercentage: ratio(strikeouts, plateAppearances),
  };
}

function calculatePitchingSeason(
  row: RawPlayer["pitchingStats"][number],
): ComputedPitchingSeason {
  const innings = parseInnings(row.投球回);
  const hits = toNumber(row.安打) ?? 0;
  const walks = toNumber(row.四球) ?? 0;
  const strikeouts = toNumber(row.奪三振 ?? row.三振) ?? 0;
  const earnedRuns = toNumber(row.自責点);

  return {
    season: parseSeason(row),
    team: text(row.所属球団),
    era:
      toNumber(row.防御率) ??
      (innings && earnedRuns !== null
        ? round((earnedRuns * 9) / innings)
        : null),
    whip: innings && innings > 0 ? round((hits + walks) / innings) : null,
    strikeoutsPerNine:
      innings && innings > 0 ? round((strikeouts * 9) / innings) : null,
    walksPerNine: innings && innings > 0 ? round((walks * 9) / innings) : null,
    strikeoutToWalkRatio: ratio(strikeouts, walks),
  };
}

export function calculatePlayerStats(player: RawPlayer): EnrichedPlayer {
  const batting = player.battingStats.map(calculateBattingSeason);
  const pitching = player.pitchingStats.map(calculatePitchingSeason);
  const computedStats: PlayerComputedStats = {
    batting,
    pitching,
    career: {
      batting: calculateBattingCareer(player.battingStats),
      pitching: calculatePitchingCareer(player.pitchingStats),
    },
  };

  return { ...player, computedStats };
}

export function calculateSnapshot(
  snapshot: import("./types.js").RawSnapshot,
): import("./types.js").EnrichedSnapshot {
  return {
    ...snapshot,
    pipeline: "calculate",
    generatedAt: new Date().toISOString(),
    players: snapshot.players.map(calculatePlayerStats),
  };
}
