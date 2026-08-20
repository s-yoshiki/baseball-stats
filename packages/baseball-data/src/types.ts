export type BattingStatColumn =
  | "season"
  | "team"
  | "games"
  | "plateAppearances"
  | "atBats"
  | "runs"
  | "hits"
  | "doubles"
  | "triples"
  | "homeRuns"
  | "totalBases"
  | "rbi"
  | "steals"
  | "caughtStealing"
  | "sacrificeHits"
  | "sacrificeFlies"
  | "walks"
  | "hitByPitch"
  | "strikeouts"
  | "groundedIntoDoublePlays"
  | "battingAverage"
  | "onBasePercentage"
  | "sluggingPercentage";

export type PitchingStatColumn =
  | "season"
  | "team"
  | "games"
  | "wins"
  | "losses"
  | "saves"
  | "holds"
  | "holdPoints"
  | "completeGames"
  | "shutouts"
  | "noWalkCompleteGames"
  | "winningPercentage"
  | "battersFaced"
  | "innings"
  | "hitsAllowed"
  | "homeRunsAllowed"
  | "walksAllowed"
  | "hitByPitch"
  | "strikeouts"
  | "wildPitches"
  | "balks"
  | "runsAllowed"
  | "earnedRuns"
  | "era";

export type NpbBattingStatColumn =
  | "年度"
  | "所属球団"
  | "試合"
  | "打席"
  | "打数"
  | "得点"
  | "安打"
  | "二塁打"
  | "三塁打"
  | "本塁打"
  | "塁打"
  | "打点"
  | "盗塁"
  | "盗塁刺"
  | "犠打"
  | "犠飛"
  | "四球"
  | "死球"
  | "三振"
  | "併殺打"
  | "打率"
  | "出塁率"
  | "長打率";

export type NpbPitchingStatColumn =
  | "年度"
  | "所属球団"
  | "登板"
  | "勝利"
  | "敗北"
  | "セーブ"
  | "ホールド"
  | "H"
  | "HP"
  | "完投"
  | "完封勝"
  | "無四球"
  | "勝率"
  | "打者"
  | "投球回"
  | "安打"
  | "本塁打"
  | "四球"
  | "死球"
  | "奪三振"
  | "三振"
  | "暴投"
  | "ボーク"
  | "失点"
  | "自責点"
  | "防御率";

export type BattingStatRow = Partial<Record<BattingStatColumn, string>>;
export type PitchingStatRow = Partial<Record<PitchingStatColumn, string>>;
export type NpbBattingStatRow = Partial<Record<NpbBattingStatColumn, string>>;
export type NpbPitchingStatRow = Partial<Record<NpbPitchingStatColumn, string>>;

export type ScrapedPlayer = {
  id: string;
  playerUrl: string;
  playerName: string;
  kanaName: string;
  isActive: boolean;
  detailInfo: Record<string, string>;
  battingStats: NpbBattingStatRow[];
  pitchingStats: NpbPitchingStatRow[];
};

export type RawPlayer = {
  id: string;
  playerUrl: string;
  playerName: string;
  kanaName: string;
  isActive: boolean;
  detailInfo: Record<string, string>;
  profileDetails?: PlayerDetails;
  battingStats: BattingStatRow[];
  pitchingStats: PitchingStatRow[];
};

export type PlayerName = {
  familyName: string | null;
  givenName: string | null;
  familyNameKana: string | null;
  givenNameKana: string | null;
  registeredName: string;
  registeredNameKana: string;
};

export type PlayerDetails = {
  position: string | null;
  throws: string | null;
  bats: string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: {
    iso: string | null;
    year: number | null;
    month: number | null;
    day: number | null;
  };
  career: {
    raw: string | null;
    entries: string[];
  };
  draft: {
    raw: string | null;
    year: number | null;
    rank: number | null;
    selection: "regular" | "development" | "outside" | null;
  };
};

export type ComputedBattingSeason = {
  season: number | null;
  team: string | null;
  battingAverage: number | null;
  onBasePercentage: number | null;
  sluggingPercentage: number | null;
  ops: number | null;
  iso: number | null;
  walkPercentage: number | null;
  strikeoutPercentage: number | null;
  babip: number | null;
  stolenBaseSuccessPercentage: number | null;
  homeRunPercentage: number | null;
  extraBaseHitPercentage: number | null;
  runsPerPlateAppearance: number | null;
  rbiPerPlateAppearance: number | null;
  walkToStrikeoutRatio: number | null;
};

export type ComputedPitchingSeason = {
  season: number | null;
  team: string | null;
  winningPercentage: number | null;
  era: number | null;
  whip: number | null;
  strikeoutsPerNine: number | null;
  walksPerNine: number | null;
  strikeoutToWalkRatio: number | null;
  hitsPerNine: number | null;
  homeRunsPerNine: number | null;
  runsPerNine: number | null;
  strikeoutPercentage: number | null;
  walkPercentage: number | null;
  strikeoutMinusWalkPercentage: number | null;
};

export type ComputedBattingCareer = {
  seasons: number;
  games: number;
  plateAppearances: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  totalBases: number;
  rbi: number;
  steals: number;
  caughtStealing: number;
  sacrificeHits: number;
  sacrificeFlies: number;
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  groundedIntoDoublePlays: number;
  battingAverage: number | null;
  onBasePercentage: number | null;
  sluggingPercentage: number | null;
  ops: number | null;
  iso: number | null;
  babip: number | null;
  stolenBaseSuccessPercentage: number | null;
  homeRunPercentage: number | null;
  extraBaseHitPercentage: number | null;
  runsPerPlateAppearance: number | null;
  rbiPerPlateAppearance: number | null;
  walkToStrikeoutRatio: number | null;
};

export type ComputedPitchingCareer = {
  seasons: number;
  games: number;
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  holdPoints: number;
  completeGames: number;
  shutouts: number;
  noWalkCompleteGames: number;
  battersFaced: number;
  innings: number;
  hitsAllowed: number;
  homeRunsAllowed: number;
  walksAllowed: number;
  hitByPitch: number;
  strikeouts: number;
  wildPitches: number;
  balks: number;
  runsAllowed: number;
  earnedRuns: number;
  winningPercentage: number | null;
  era: number | null;
  whip: number | null;
  strikeoutsPerNine: number | null;
  walksPerNine: number | null;
  strikeoutToWalkRatio: number | null;
  hitsPerNine: number | null;
  homeRunsPerNine: number | null;
  runsPerNine: number | null;
  strikeoutPercentage: number | null;
  walkPercentage: number | null;
  strikeoutMinusWalkPercentage: number | null;
};

export type PlayerComputedStats = {
  batting: ComputedBattingSeason[];
  pitching: ComputedPitchingSeason[];
  career: {
    batting: ComputedBattingCareer;
    pitching: ComputedPitchingCareer;
  };
};

export type EnrichedPlayer = RawPlayer & {
  computedStats: PlayerComputedStats;
};

export type DataPipeline = "scrape" | "calculate";

export type DataSnapshot<TPlayer> = {
  pipeline: DataPipeline;
  generatedAt: string;
  source: {
    name: "npb.jp";
    url: string;
  };
  players: TPlayer[];
};

export type RawSnapshot = DataSnapshot<RawPlayer>;
export type EnrichedSnapshot = DataSnapshot<EnrichedPlayer>;

export type BattingTotals = {
  games: number | null;
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
  sacrificeHits: number | null;
  sacrificeFlies: number | null;
  walks: number | null;
  hitByPitch: number | null;
  strikeouts: number | null;
  groundedIntoDoublePlays: number | null;
};

export type PitchingTotals = {
  games: number | null;
  wins: number | null;
  losses: number | null;
  saves: number | null;
  holds: number | null;
  holdPoints: number | null;
  completeGames: number | null;
  shutouts: number | null;
  noWalkCompleteGames: number | null;
  winningPercentage: number | null;
  battersFaced: number | null;
  innings: number | null;
  hitsAllowed: number | null;
  homeRunsAllowed: number | null;
  walksAllowed: number | null;
  hitByPitch: number | null;
  strikeouts: number | null;
  wildPitches: number | null;
  balks: number | null;
  runsAllowed: number | null;
  earnedRuns: number | null;
};

export type PlayerApiBattingStat = {
  season: number | null;
  team: string | null;
  totals: BattingTotals;
  metrics: Omit<ComputedBattingSeason, "season" | "team">;
};

export type PlayerApiPitchingStat = {
  season: number | null;
  team: string | null;
  totals: PitchingTotals;
  metrics: Omit<ComputedPitchingSeason, "season" | "team">;
};

export type PlayerApiAttributes = {
  profile: {
    familyName: PlayerName["familyName"];
    givenName: PlayerName["givenName"];
    familyNameKana: PlayerName["familyNameKana"];
    givenNameKana: PlayerName["givenNameKana"];
    registeredName: PlayerName["registeredName"];
    registeredNameKana: PlayerName["registeredNameKana"];
    url: string;
    isActive: boolean;
    details: PlayerDetails;
  };
  battingStats: PlayerApiBattingStat[];
  pitchingStats: PlayerApiPitchingStat[];
  career: PlayerComputedStats["career"];
};

export type PlayerApiResource = {
  type: "player";
  id: string;
  attributes: PlayerApiAttributes;
  links: {
    self: string;
  };
};

export type PlayerApiDocument = {
  data: PlayerApiResource;
};

export type PlayerApiIndexDocument = {
  data: Array<{
    type: "player";
    id: string;
    attributes: Pick<
      PlayerApiAttributes["profile"],
      | "familyName"
      | "givenName"
      | "familyNameKana"
      | "givenNameKana"
      | "registeredName"
      | "registeredNameKana"
    > & { isActive: boolean };
    links: {
      self: string;
    };
  }>;
};
