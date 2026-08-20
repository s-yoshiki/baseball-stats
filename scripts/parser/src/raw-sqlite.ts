import fs from "node:fs";
import path from "node:path";
import type {
  BattingStatRow,
  PitchingStatRow,
  RawPlayer,
  ScrapedPlayer,
} from "@repo/baseball-data";
import {
  normalizeBattingStat,
  normalizePitchingStat,
  parsePlayerDetails,
} from "@repo/baseball-data";
import { sql } from "kysely";
import {
  createRawKyselyDb,
  createRawSchema,
  type RawPlayersTable,
} from "./raw-schema.js";

export type RawSqliteResult = {
  runId: string;
  players: number;
};

export type RawSqliteWriter = {
  runId: string;
  writePlayer: (player: ScrapedPlayer) => Promise<void>;
  finish: () => Promise<RawSqliteResult>;
  close: () => Promise<void>;
};

export type RawSqliteProfile = {
  position: string | null;
  batsThrows: string | null;
  heightWeight: string | null;
  birthDate: string | null;
  career: string | null;
  draft: string | null;
  additional: Array<{ sourceKey: string; value: string }>;
};

type RawSqlitePayload = {
  id: string;
  playerUrl: string;
  playerName: string;
  kanaName: string;
  isActive: boolean;
  profile: RawSqliteProfile;
  battingStats: ReturnType<typeof normalizeBattingStat>[];
  pitchingStats: ReturnType<typeof normalizePitchingStat>[];
};

function createPayload(player: ScrapedPlayer): RawSqlitePayload {
  const details = player.detailInfo;
  const knownDetailKeys = new Set([
    "ポジション",
    "守備位置",
    "投打",
    "身長／体重",
    "身長/体重",
    "生年月日",
    "経歴",
    "ドラフト",
  ]);
  return {
    id: player.id,
    playerUrl: player.playerUrl,
    playerName: player.playerName,
    kanaName: player.kanaName,
    isActive: player.isActive,
    profile: {
      position: details.ポジション ?? details.守備位置 ?? null,
      batsThrows: details.投打 ?? null,
      heightWeight: details["身長／体重"] ?? details["身長/体重"] ?? null,
      birthDate: details.生年月日 ?? null,
      career: details.経歴 ?? null,
      draft: details.ドラフト ?? null,
      additional: Object.entries(details)
        .filter(([key]) => !knownDetailKeys.has(key))
        .map(([sourceKey, value]) => ({ sourceKey, value })),
    },
    battingStats: player.battingStats.map(normalizeBattingStat),
    pitchingStats: player.pitchingStats.map(normalizePitchingStat),
  };
}

function createRunId(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, "");
}

export async function writeRawPlayersToSqlite(
  players: ScrapedPlayer[],
  dbPath: string,
  runId = createRunId(),
): Promise<RawSqliteResult> {
  const writer = await openRawSqliteWriter(dbPath, runId);
  try {
    for (const player of players) {
      await writer.writePlayer(player);
    }
    return await writer.finish();
  } finally {
    await writer.close();
  }
}

export async function openRawSqliteWriter(
  dbPath: string,
  runId = createRunId(),
): Promise<RawSqliteWriter> {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = createRawKyselyDb(dbPath);
  const startedAt = new Date().toISOString();
  let playerCount = 0;
  let finished = false;
  let closed = false;
  let result: RawSqliteResult | undefined;

  await createRawSchema(db);
  await db
    .insertInto("scrape_runs")
    .values({
      id: runId,
      source: "npb.jp",
      started_at: startedAt,
      completed_at: null,
      player_count: 0,
    })
    .execute();

  return {
    runId,
    async writePlayer(player) {
      if (closed) throw new Error("Cannot write to a closed raw SQLite writer");
      if (finished)
        throw new Error("Cannot write after finishing a raw SQLite run");

      const payload = createPayload(player);
      await db
        .insertInto("raw_players")
        .values({
          run_id: runId,
          player_id: player.id,
          player_url: player.playerUrl,
          player_name: player.playerName,
          kana_name: player.kanaName,
          is_active: player.isActive ? 1 : 0,
          profile_json: JSON.stringify(payload.profile),
          batting_stats_json: JSON.stringify(payload.battingStats),
          pitching_stats_json: JSON.stringify(payload.pitchingStats),
        })
        .execute();
      playerCount += 1;
    },
    async finish() {
      if (result) return result;
      if (closed) throw new Error("Cannot finish a closed raw SQLite writer");

      await db
        .updateTable("scrape_runs")
        .set({
          completed_at: new Date().toISOString(),
          player_count: playerCount,
        })
        .where("id", "=", runId)
        .execute();
      finished = true;
      result = { runId, players: playerCount };
      return result;
    },
    async close() {
      if (closed) return;
      closed = true;
      await db.destroy();
    },
  };
}

function detailInfoFromProfile(
  profile: RawSqliteProfile,
): Record<string, string> {
  const details: Record<string, string> = {};
  if (profile.position) details.ポジション = profile.position;
  if (profile.batsThrows) details.投打 = profile.batsThrows;
  if (profile.heightWeight) details["身長／体重"] = profile.heightWeight;
  if (profile.birthDate) details.生年月日 = profile.birthDate;
  if (profile.career) details.経歴 = profile.career;
  if (profile.draft) details.ドラフト = profile.draft;
  for (const item of profile.additional) details[item.sourceKey] = item.value;
  return details;
}

export async function readKnownPlayerIds(dbPath: string): Promise<Set<string>> {
  const db = createRawKyselyDb(dbPath);
  try {
    const rows = await db
      .selectFrom("raw_players")
      .innerJoin("scrape_runs", "scrape_runs.id", "raw_players.run_id")
      .select("raw_players.player_id")
      .where("scrape_runs.completed_at", "is not", null)
      .distinct()
      .execute();
    return new Set(rows.map((row) => row.player_id));
  } finally {
    await db.destroy();
  }
}

export async function readLatestRawPlayers(
  dbPath: string,
): Promise<RawPlayer[]> {
  const db = createRawKyselyDb(dbPath);
  try {
    const result = await sql<RawPlayersTable>`
      SELECT candidate.run_id,
             candidate.player_id,
             candidate.player_url,
             candidate.player_name,
             candidate.kana_name,
             candidate.is_active,
             candidate.profile_json,
             candidate.batting_stats_json,
             candidate.pitching_stats_json
      FROM raw_players AS candidate
      INNER JOIN scrape_runs AS candidate_run
        ON candidate_run.id = candidate.run_id
      WHERE candidate_run.completed_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM raw_players AS newer
          INNER JOIN scrape_runs AS newer_run
            ON newer_run.id = newer.run_id
          WHERE newer.player_id = candidate.player_id
            AND newer_run.completed_at IS NOT NULL
            AND (
              newer_run.completed_at > candidate_run.completed_at
              OR (
                newer_run.completed_at = candidate_run.completed_at
                AND newer_run.id > candidate_run.id
              )
            )
        )
      ORDER BY candidate.player_id
    `.execute(db);
    if (!result.rows.length)
      throw new Error(`No scrape runs found in ${dbPath}`);

    return result.rows.map((row) => {
      const profile = JSON.parse(row.profile_json) as RawSqliteProfile;
      const detailInfo = detailInfoFromProfile(profile);
      return {
        id: row.player_id,
        playerUrl: row.player_url,
        playerName: row.player_name,
        kanaName: row.kana_name,
        isActive: row.is_active === 1,
        detailInfo,
        profileDetails: parsePlayerDetails(detailInfo),
        battingStats: JSON.parse(row.batting_stats_json) as BattingStatRow[],
        pitchingStats: JSON.parse(row.pitching_stats_json) as PitchingStatRow[],
      };
    });
  } finally {
    await db.destroy();
  }
}
