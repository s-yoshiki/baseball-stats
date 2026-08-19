import type {
  BattingStatRow,
  NpbBattingStatRow,
  NpbPitchingStatRow,
  PitchingStatRow,
  RawPlayer,
  ScrapedPlayer,
} from "./types.js";

const BATTING_KEYS = {
  年度: "season",
  所属球団: "team",
  試合: "games",
  打席: "plateAppearances",
  打数: "atBats",
  得点: "runs",
  安打: "hits",
  二塁打: "doubles",
  三塁打: "triples",
  本塁打: "homeRuns",
  塁打: "totalBases",
  打点: "rbi",
  盗塁: "steals",
  盗塁刺: "caughtStealing",
  犠打: "sacrificeHits",
  犠飛: "sacrificeFlies",
  四球: "walks",
  死球: "hitByPitch",
  三振: "strikeouts",
  併殺打: "groundedIntoDoublePlays",
  打率: "battingAverage",
  出塁率: "onBasePercentage",
  長打率: "sluggingPercentage",
} as const;

const PITCHING_KEYS = {
  年度: "season",
  所属球団: "team",
  登板: "games",
  勝利: "wins",
  敗北: "losses",
  セーブ: "saves",
  ホールド: "holds",
  H: "holds",
  HP: "holdPoints",
  完投: "completeGames",
  完封勝: "shutouts",
  無四球: "noWalkCompleteGames",
  勝率: "winningPercentage",
  打者: "battersFaced",
  投球回: "innings",
  安打: "hitsAllowed",
  本塁打: "homeRunsAllowed",
  四球: "walksAllowed",
  死球: "hitByPitch",
  奪三振: "strikeouts",
  三振: "strikeouts",
  暴投: "wildPitches",
  ボーク: "balks",
  失点: "runsAllowed",
  自責点: "earnedRuns",
  防御率: "era",
} as const;

export function normalizeBattingStat(row: NpbBattingStatRow): BattingStatRow {
  const normalized: BattingStatRow = {};
  for (const [key, value] of Object.entries(row)) {
    const englishKey = BATTING_KEYS[key as keyof typeof BATTING_KEYS];
    if (englishKey && value !== undefined) {
      normalized[englishKey] = value;
    }
  }
  return normalized;
}

export function normalizePitchingStat(
  row: NpbPitchingStatRow,
): PitchingStatRow {
  const normalized: PitchingStatRow = {};
  for (const [key, value] of Object.entries(row)) {
    const englishKey = PITCHING_KEYS[key as keyof typeof PITCHING_KEYS];
    if (englishKey && value !== undefined) {
      normalized[englishKey] = value;
    }
  }
  return normalized;
}

export function normalizeScrapedPlayer(player: ScrapedPlayer): RawPlayer {
  return {
    id: player.id,
    playerUrl: player.playerUrl,
    playerName: player.playerName,
    kanaName: player.kanaName,
    isActive: player.isActive,
    detailInfo: player.detailInfo,
    battingStats: player.battingStats.map(normalizeBattingStat),
    pitchingStats: player.pitchingStats.map(normalizePitchingStat),
  };
}
