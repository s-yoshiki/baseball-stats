import {
  addNullable,
  parseInnings,
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
  const games = sum(rows.map((row) => toNumber(row.games)));
  const plateAppearances = sum(
    rows.map((row) => toNumber(row.plateAppearances)),
  );
  const atBats = sum(rows.map((row) => toNumber(row.atBats)));
  const runs = sum(rows.map((row) => toNumber(row.runs)));
  const hits = sum(rows.map((row) => toNumber(row.hits)));
  const doubles = sum(rows.map((row) => toNumber(row.doubles)));
  const triples = sum(rows.map((row) => toNumber(row.triples)));
  const homeRuns = sum(rows.map((row) => toNumber(row.homeRuns)));
  const totalBases = sum(rows.map((row) => toNumber(row.totalBases)));
  const rbi = sum(rows.map((row) => toNumber(row.rbi)));
  const steals = sum(rows.map((row) => toNumber(row.steals)));
  const walks = sum(rows.map((row) => toNumber(row.walks)));
  const hitByPitch = sum(rows.map((row) => toNumber(row.hitByPitch)));
  const strikeouts = sum(rows.map((row) => toNumber(row.strikeouts)));
  const battingAverage = ratio(hits, atBats);
  const onBasePercentage = ratio(hits + walks + hitByPitch, plateAppearances);
  const sluggingPercentage = ratio(totalBases, atBats);

  return {
    seasons: rows.filter((row) => toNumber(row.season) !== null).length,
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
  const games = sum(rows.map((row) => toNumber(row.games)));
  const wins = sum(rows.map((row) => toNumber(row.wins)));
  const losses = sum(rows.map((row) => toNumber(row.losses)));
  const saves = sum(rows.map((row) => toNumber(row.saves)));
  const holds = sum(rows.map((row) => toNumber(row.holds)));
  const innings = sum(rows.map((row) => parseInnings(row.innings)));
  const hitsAllowed = sum(rows.map((row) => toNumber(row.hitsAllowed)));
  const walksAllowed = sum(rows.map((row) => toNumber(row.walksAllowed)));
  const strikeouts = sum(rows.map((row) => toNumber(row.strikeouts)));
  const earnedRuns = sum(rows.map((row) => toNumber(row.earnedRuns)));
  const decisions = wins + losses;

  return {
    seasons: rows.filter((row) => toNumber(row.season) !== null).length,
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
  const plateAppearances = toNumber(row.plateAppearances) ?? 0;
  const atBats = toNumber(row.atBats) ?? 0;
  const hits = toNumber(row.hits) ?? 0;
  const walks = toNumber(row.walks) ?? 0;
  const hitByPitch = toNumber(row.hitByPitch) ?? 0;
  const strikeouts = toNumber(row.strikeouts) ?? 0;
  const battingAverage = toNumber(row.battingAverage) ?? ratio(hits, atBats);
  const onBasePercentage =
    toNumber(row.onBasePercentage) ??
    ratio(hits + walks + hitByPitch, plateAppearances);
  const sluggingPercentage =
    toNumber(row.sluggingPercentage) ??
    ratio(toNumber(row.totalBases) ?? 0, atBats);

  return {
    season: toNumber(row.season),
    team: text(row.team),
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
  const innings = parseInnings(row.innings);
  const hits = toNumber(row.hitsAllowed) ?? 0;
  const walks = toNumber(row.walksAllowed) ?? 0;
  const strikeouts = toNumber(row.strikeouts) ?? 0;
  const earnedRuns = toNumber(row.earnedRuns);

  return {
    season: toNumber(row.season),
    team: text(row.team),
    era:
      toNumber(row.era) ??
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
