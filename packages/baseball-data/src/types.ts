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
