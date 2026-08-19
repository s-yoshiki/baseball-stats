export type BattingStatColumn =
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

export type PitchingStatColumn =
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

export type RawPlayer = {
  id: string;
  playerUrl: string;
  playerName: string;
  kanaName: string;
  isActive: boolean;
  detailInfo: Record<string, string>;
  battingStats: BattingStatRow[];
  pitchingStats: PitchingStatRow[];
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
};

export type ComputedPitchingSeason = {
  season: number | null;
  team: string | null;
  era: number | null;
  whip: number | null;
  strikeoutsPerNine: number | null;
  walksPerNine: number | null;
  strikeoutToWalkRatio: number | null;
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
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  battingAverage: number | null;
  onBasePercentage: number | null;
  sluggingPercentage: number | null;
  ops: number | null;
  iso: number | null;
};

export type ComputedPitchingCareer = {
  seasons: number;
  games: number;
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  innings: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeouts: number;
  earnedRuns: number;
  winningPercentage: number | null;
  era: number | null;
  whip: number | null;
  strikeoutsPerNine: number | null;
  walksPerNine: number | null;
  strikeoutToWalkRatio: number | null;
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
  schemaVersion: 1;
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
