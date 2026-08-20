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

function valueOrZero(value: number | null): number {
  return value ?? 0;
}

function knownRatio(
  numerator: number,
  denominator: number,
  required: Array<number | null>,
): number | null {
  return required.some((value) => value === null)
    ? null
    : ratio(numerator, denominator);
}

type BattingMetricInputs = {
  plateAppearances: number | null;
  atBats: number | null;
  runs: number | null;
  hits: number | null;
  doubles: number | null;
  triples: number | null;
  homeRuns: number | null;
  totalBases: number | null;
  rbi: number | null;
  steals: number | null;
  caughtStealing: number | null;
  sacrificeFlies: number | null;
  walks: number | null;
  hitByPitch: number | null;
  strikeouts: number | null;
};

function calculateBabip(
  hits: number | null,
  homeRuns: number | null,
  atBats: number | null,
  strikeouts: number | null,
  sacrificeFlies: number | null,
): number | null {
  if (
    hits === null ||
    homeRuns === null ||
    atBats === null ||
    strikeouts === null
  ) {
    return null;
  }

  return ratio(
    hits - homeRuns,
    atBats - strikeouts - homeRuns + (sacrificeFlies ?? 0),
  );
}

function calculateBattingMetrics(
  input: BattingMetricInputs,
  overrides: {
    battingAverage?: number | null;
    onBasePercentage?: number | null;
    sluggingPercentage?: number | null;
  } = {},
): Omit<ComputedBattingSeason, "season" | "team"> {
  const plateAppearances = valueOrZero(input.plateAppearances);
  const atBats = valueOrZero(input.atBats);
  const hits = valueOrZero(input.hits);
  const walks = valueOrZero(input.walks);
  const hitByPitch = valueOrZero(input.hitByPitch);
  const strikeouts = valueOrZero(input.strikeouts);
  const sacrificeFlies = valueOrZero(input.sacrificeFlies);
  const onBaseDenominator =
    input.sacrificeFlies !== null && input.atBats !== null
      ? atBats + walks + hitByPitch + sacrificeFlies
      : input.plateAppearances !== null
        ? plateAppearances
        : atBats + walks + hitByPitch;
  const battingAverage = overrides.battingAverage ?? ratio(hits, atBats);
  const onBasePercentage =
    overrides.onBasePercentage ??
    ratio(hits + walks + hitByPitch, onBaseDenominator);
  const sluggingPercentage =
    overrides.sluggingPercentage ??
    ratio(valueOrZero(input.totalBases), atBats);

  return {
    battingAverage,
    onBasePercentage,
    sluggingPercentage,
    ops: addNullable(onBasePercentage, sluggingPercentage),
    iso: subtractNullable(sluggingPercentage, battingAverage),
    walkPercentage: ratio(walks, plateAppearances),
    strikeoutPercentage: ratio(strikeouts, plateAppearances),
    babip: calculateBabip(
      input.hits,
      input.homeRuns,
      input.atBats,
      input.strikeouts,
      input.sacrificeFlies,
    ),
    stolenBaseSuccessPercentage: knownRatio(
      valueOrZero(input.steals),
      valueOrZero(input.steals) + valueOrZero(input.caughtStealing),
      [input.steals, input.caughtStealing],
    ),
    homeRunPercentage: knownRatio(
      valueOrZero(input.homeRuns),
      plateAppearances,
      [input.homeRuns, input.plateAppearances],
    ),
    extraBaseHitPercentage: knownRatio(
      valueOrZero(input.doubles) +
        valueOrZero(input.triples) +
        valueOrZero(input.homeRuns),
      hits,
      [input.doubles, input.triples, input.homeRuns, input.hits],
    ),
    runsPerPlateAppearance: knownRatio(
      valueOrZero(input.runs),
      plateAppearances,
      [input.runs, input.plateAppearances],
    ),
    rbiPerPlateAppearance: knownRatio(
      valueOrZero(input.rbi),
      plateAppearances,
      [input.rbi, input.plateAppearances],
    ),
    walkToStrikeoutRatio: knownRatio(walks, strikeouts, [
      input.walks,
      input.strikeouts,
    ]),
  };
}

function calculateBattingCareer(
  rows: RawPlayer["battingStats"],
): ComputedBattingCareer {
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
  const caughtStealing = sum(rows.map((row) => toNumber(row.caughtStealing)));
  const sacrificeHits = sum(rows.map((row) => toNumber(row.sacrificeHits)));
  const sacrificeFlies = sum(rows.map((row) => toNumber(row.sacrificeFlies)));
  const walks = sum(rows.map((row) => toNumber(row.walks)));
  const hitByPitch = sum(rows.map((row) => toNumber(row.hitByPitch)));
  const strikeouts = sum(rows.map((row) => toNumber(row.strikeouts)));
  const groundedIntoDoublePlays = sum(
    rows.map((row) => toNumber(row.groundedIntoDoublePlays)),
  );
  const metrics = calculateBattingMetrics({
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
    caughtStealing,
    sacrificeFlies,
    walks,
    hitByPitch,
    strikeouts,
  });

  return {
    seasons: new Set(
      rows
        .map((row) => toNumber(row.season))
        .filter((season): season is number => season !== null),
    ).size,
    games: sum(rows.map((row) => toNumber(row.games))),
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
    caughtStealing,
    sacrificeHits,
    sacrificeFlies,
    walks,
    hitByPitch,
    strikeouts,
    groundedIntoDoublePlays,
    ...metrics,
  };
}

type PitchingMetricInputs = {
  wins: number | null;
  losses: number | null;
  innings: number | null;
  hitsAllowed: number | null;
  homeRunsAllowed: number | null;
  walksAllowed: number | null;
  battersFaced: number | null;
  strikeouts: number | null;
  runsAllowed: number | null;
  earnedRuns: number | null;
};

function calculatePitchingMetrics(
  input: PitchingMetricInputs,
  overrides: { winningPercentage?: number | null; era?: number | null } = {},
): Omit<ComputedPitchingSeason, "season" | "team"> {
  const innings = valueOrZero(input.innings);
  const wins = valueOrZero(input.wins);
  const losses = valueOrZero(input.losses);
  const hitsAllowed = valueOrZero(input.hitsAllowed);
  const homeRunsAllowed = valueOrZero(input.homeRunsAllowed);
  const walksAllowed = valueOrZero(input.walksAllowed);
  const strikeouts = valueOrZero(input.strikeouts);
  const runsAllowed = valueOrZero(input.runsAllowed);
  const earnedRuns = valueOrZero(input.earnedRuns);
  const decisions = wins + losses;
  const perNine = (value: number): number | null =>
    innings > 0 ? round((value * 9) / innings) : null;

  return {
    winningPercentage: overrides.winningPercentage ?? ratio(wins, decisions),
    era:
      overrides.era ?? (innings > 0 ? round((earnedRuns * 9) / innings) : null),
    whip: innings > 0 ? round((hitsAllowed + walksAllowed) / innings) : null,
    strikeoutsPerNine: perNine(strikeouts),
    walksPerNine: perNine(walksAllowed),
    strikeoutToWalkRatio: ratio(strikeouts, walksAllowed),
    hitsPerNine: perNine(hitsAllowed),
    homeRunsPerNine: perNine(homeRunsAllowed),
    runsPerNine: perNine(runsAllowed),
    strikeoutPercentage: knownRatio(
      strikeouts,
      valueOrZero(input.battersFaced),
      [input.strikeouts, input.battersFaced],
    ),
    walkPercentage: knownRatio(walksAllowed, valueOrZero(input.battersFaced), [
      input.walksAllowed,
      input.battersFaced,
    ]),
    strikeoutMinusWalkPercentage: knownRatio(
      strikeouts - walksAllowed,
      valueOrZero(input.battersFaced),
      [input.strikeouts, input.walksAllowed, input.battersFaced],
    ),
  };
}

function calculatePitchingCareer(
  rows: RawPlayer["pitchingStats"],
): ComputedPitchingCareer {
  const wins = sum(rows.map((row) => toNumber(row.wins)));
  const losses = sum(rows.map((row) => toNumber(row.losses)));
  const innings = sum(rows.map((row) => parseInnings(row.innings)));
  const hitsAllowed = sum(rows.map((row) => toNumber(row.hitsAllowed)));
  const homeRunsAllowed = sum(rows.map((row) => toNumber(row.homeRunsAllowed)));
  const walksAllowed = sum(rows.map((row) => toNumber(row.walksAllowed)));
  const hitByPitch = sum(rows.map((row) => toNumber(row.hitByPitch)));
  const strikeouts = sum(rows.map((row) => toNumber(row.strikeouts)));
  const battersFaced = sum(rows.map((row) => toNumber(row.battersFaced)));
  const runsAllowed = sum(rows.map((row) => toNumber(row.runsAllowed)));
  const earnedRuns = sum(rows.map((row) => toNumber(row.earnedRuns)));
  const metrics = calculatePitchingMetrics({
    wins,
    losses,
    innings,
    hitsAllowed,
    homeRunsAllowed,
    walksAllowed,
    battersFaced,
    strikeouts,
    runsAllowed,
    earnedRuns,
  });

  return {
    seasons: new Set(
      rows
        .map((row) => toNumber(row.season))
        .filter((season): season is number => season !== null),
    ).size,
    games: sum(rows.map((row) => toNumber(row.games))),
    wins,
    losses,
    saves: sum(rows.map((row) => toNumber(row.saves))),
    holds: sum(rows.map((row) => toNumber(row.holds))),
    holdPoints: sum(rows.map((row) => toNumber(row.holdPoints))),
    completeGames: sum(rows.map((row) => toNumber(row.completeGames))),
    shutouts: sum(rows.map((row) => toNumber(row.shutouts))),
    noWalkCompleteGames: sum(
      rows.map((row) => toNumber(row.noWalkCompleteGames)),
    ),
    battersFaced,
    innings: round(innings, 3) ?? 0,
    hitsAllowed,
    homeRunsAllowed,
    walksAllowed,
    hitByPitch,
    strikeouts,
    wildPitches: sum(rows.map((row) => toNumber(row.wildPitches))),
    balks: sum(rows.map((row) => toNumber(row.balks))),
    runsAllowed,
    earnedRuns,
    ...metrics,
  };
}

function calculateBattingSeason(
  row: RawPlayer["battingStats"][number],
): ComputedBattingSeason {
  const metrics = calculateBattingMetrics(
    {
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
      sacrificeFlies: toNumber(row.sacrificeFlies),
      walks: toNumber(row.walks),
      hitByPitch: toNumber(row.hitByPitch),
      strikeouts: toNumber(row.strikeouts),
    },
    {
      battingAverage: toNumber(row.battingAverage),
      onBasePercentage: toNumber(row.onBasePercentage),
      sluggingPercentage: toNumber(row.sluggingPercentage),
    },
  );

  return {
    season: toNumber(row.season),
    team: text(row.team),
    ...metrics,
  };
}

function calculatePitchingSeason(
  row: RawPlayer["pitchingStats"][number],
): ComputedPitchingSeason {
  const metrics = calculatePitchingMetrics(
    {
      wins: toNumber(row.wins),
      losses: toNumber(row.losses),
      innings: parseInnings(row.innings),
      hitsAllowed: toNumber(row.hitsAllowed),
      homeRunsAllowed: toNumber(row.homeRunsAllowed),
      walksAllowed: toNumber(row.walksAllowed),
      battersFaced: toNumber(row.battersFaced),
      strikeouts: toNumber(row.strikeouts),
      runsAllowed: toNumber(row.runsAllowed),
      earnedRuns: toNumber(row.earnedRuns),
    },
    {
      winningPercentage: toNumber(row.winningPercentage),
      era: toNumber(row.era),
    },
  );

  return {
    season: toNumber(row.season),
    team: text(row.team),
    ...metrics,
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
