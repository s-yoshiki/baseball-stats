import {
  calculatePlayerStats,
  type EnrichedPlayer,
  type EnrichedSnapshot,
  parseInnings,
  type RawPlayer,
  toNumber,
} from "@repo/baseball-data";
import BetterSqlite3 from "better-sqlite3";
import { type Generated, Kysely, SqliteDialect, sql } from "kysely";

export interface PlayersTable {
  id: string;
  player_name: string;
  kana_name: string;
  player_url: string;
  is_active: number;
  team: string | null;
  position: string | null;
  detail_json: string;
  computed_json: string;
  created_at: Generated<string>;
}

export interface BattingStatsTable {
  id: Generated<number>;
  player_id: string;
  season: number | null;
  team: string | null;
  games: number | null;
  plate_appearances: number | null;
  at_bats: number | null;
  runs: number | null;
  hits: number | null;
  doubles: number | null;
  triples: number | null;
  home_runs: number | null;
  total_bases: number | null;
  rbi: number | null;
  steals: number | null;
  walks: number | null;
  hit_by_pitch: number | null;
  strikeouts: number | null;
  batting_average: number | null;
  on_base_percentage: number | null;
  slugging_percentage: number | null;
  ops: number | null;
  iso: number | null;
  walk_percentage: number | null;
  strikeout_percentage: number | null;
}

export interface PitchingStatsTable {
  id: Generated<number>;
  player_id: string;
  season: number | null;
  team: string | null;
  games: number | null;
  wins: number | null;
  losses: number | null;
  saves: number | null;
  holds: number | null;
  innings: number | null;
  hits_allowed: number | null;
  walks_allowed: number | null;
  strikeouts: number | null;
  earned_runs: number | null;
  era: number | null;
  whip: number | null;
  strikeouts_per_nine: number | null;
  walks_per_nine: number | null;
  strikeout_to_walk_ratio: number | null;
}

export interface DatabaseSchema {
  players: PlayersTable;
  batting_stats: BattingStatsTable;
  pitching_stats: PitchingStatsTable;
}

export function createKyselyDb(dbPath: string): Kysely<DatabaseSchema> {
  const sqlite = new BetterSqlite3(dbPath);
  return new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({ database: sqlite }),
  });
}

export async function createSchema(db: Kysely<DatabaseSchema>): Promise<void> {
  await sql`PRAGMA foreign_keys = ON`.execute(db);
  await db.schema
    .createTable("players")
    .ifNotExists()
    .addColumn("id", "text", (column) => column.primaryKey())
    .addColumn("player_name", "text", (column) => column.notNull())
    .addColumn("kana_name", "text", (column) => column.notNull())
    .addColumn("player_url", "text", (column) => column.notNull())
    .addColumn("is_active", "integer", (column) => column.notNull())
    .addColumn("team", "text")
    .addColumn("position", "text")
    .addColumn("detail_json", "text", (column) => column.notNull())
    .addColumn("computed_json", "text", (column) => column.notNull())
    .addColumn("created_at", "text", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();

  await db.schema
    .createTable("batting_stats")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("player_id", "text", (column) =>
      column.notNull().references("players.id").onDelete("cascade"),
    )
    .addColumn("season", "integer")
    .addColumn("team", "text")
    .addColumn("games", "integer")
    .addColumn("plate_appearances", "integer")
    .addColumn("at_bats", "integer")
    .addColumn("runs", "integer")
    .addColumn("hits", "integer")
    .addColumn("doubles", "integer")
    .addColumn("triples", "integer")
    .addColumn("home_runs", "integer")
    .addColumn("total_bases", "integer")
    .addColumn("rbi", "integer")
    .addColumn("steals", "integer")
    .addColumn("walks", "integer")
    .addColumn("hit_by_pitch", "integer")
    .addColumn("strikeouts", "integer")
    .addColumn("batting_average", "real")
    .addColumn("on_base_percentage", "real")
    .addColumn("slugging_percentage", "real")
    .addColumn("ops", "real")
    .addColumn("iso", "real")
    .addColumn("walk_percentage", "real")
    .addColumn("strikeout_percentage", "real")
    .execute();

  await db.schema
    .createTable("pitching_stats")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("player_id", "text", (column) =>
      column.notNull().references("players.id").onDelete("cascade"),
    )
    .addColumn("season", "integer")
    .addColumn("team", "text")
    .addColumn("games", "integer")
    .addColumn("wins", "integer")
    .addColumn("losses", "integer")
    .addColumn("saves", "integer")
    .addColumn("holds", "integer")
    .addColumn("innings", "real")
    .addColumn("hits_allowed", "integer")
    .addColumn("walks_allowed", "integer")
    .addColumn("strikeouts", "integer")
    .addColumn("earned_runs", "integer")
    .addColumn("era", "real")
    .addColumn("whip", "real")
    .addColumn("strikeouts_per_nine", "real")
    .addColumn("walks_per_nine", "real")
    .addColumn("strikeout_to_walk_ratio", "real")
    .execute();

  await sql`CREATE INDEX IF NOT EXISTS idx_batting_player ON batting_stats(player_id)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_batting_season ON batting_stats(season)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_pitching_player ON pitching_stats(player_id)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_pitching_season ON pitching_stats(season)`.execute(
    db,
  );
}

function isEnrichedPlayer(
  player: RawPlayer | EnrichedPlayer,
): player is EnrichedPlayer {
  return "computedStats" in player;
}

function detail(player: RawPlayer, key: string): string | null {
  return player.detailInfo[key]?.trim() || null;
}

export async function writeSnapshotToSqlite(
  snapshot: EnrichedSnapshot,
  dbPath: string,
): Promise<{ players: number; battingRows: number; pitchingRows: number }> {
  const db = createKyselyDb(dbPath);
  try {
    await createSchema(db);
    const players = snapshot.players.map((player) =>
      isEnrichedPlayer(player) ? player : calculatePlayerStats(player),
    );

    let battingRows = 0;
    let pitchingRows = 0;
    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom("batting_stats").execute();
      await trx.deleteFrom("pitching_stats").execute();
      await trx.deleteFrom("players").execute();

      for (const player of players) {
        await trx
          .insertInto("players")
          .values({
            id: player.id,
            player_name: player.playerName,
            kana_name: player.kanaName,
            player_url: player.playerUrl,
            is_active: player.isActive ? 1 : 0,
            team: detail(player, "所属球団"),
            position: detail(player, "守備位置"),
            detail_json: JSON.stringify(player.detailInfo),
            computed_json: JSON.stringify(player.computedStats),
          })
          .execute();

        const battingComputed = player.computedStats.batting;
        for (const [index, row] of player.battingStats.entries()) {
          const computed = battingComputed[index];
          await trx
            .insertInto("batting_stats")
            .values({
              player_id: player.id,
              season: toNumber(row.年度),
              team: row.所属球団 ?? null,
              games: toNumber(row.試合),
              plate_appearances: toNumber(row.打席),
              at_bats: toNumber(row.打数),
              runs: toNumber(row.得点),
              hits: toNumber(row.安打),
              doubles: toNumber(row.二塁打),
              triples: toNumber(row.三塁打),
              home_runs: toNumber(row.本塁打),
              total_bases: toNumber(row.塁打),
              rbi: toNumber(row.打点),
              steals: toNumber(row.盗塁),
              walks: toNumber(row.四球),
              hit_by_pitch: toNumber(row.死球),
              strikeouts: toNumber(row.三振),
              batting_average: computed?.battingAverage ?? null,
              on_base_percentage: computed?.onBasePercentage ?? null,
              slugging_percentage: computed?.sluggingPercentage ?? null,
              ops: computed?.ops ?? null,
              iso: computed?.iso ?? null,
              walk_percentage: computed?.walkPercentage ?? null,
              strikeout_percentage: computed?.strikeoutPercentage ?? null,
            })
            .execute();
          battingRows += 1;
        }

        const pitchingComputed = player.computedStats.pitching;
        for (const [index, row] of player.pitchingStats.entries()) {
          const computed = pitchingComputed[index];
          await trx
            .insertInto("pitching_stats")
            .values({
              player_id: player.id,
              season: toNumber(row.年度),
              team: row.所属球団 ?? null,
              games: toNumber(row.登板),
              wins: toNumber(row.勝利),
              losses: toNumber(row.敗北),
              saves: toNumber(row.セーブ),
              holds: toNumber(row.ホールド ?? row.H),
              innings: parseInnings(row.投球回),
              hits_allowed: toNumber(row.安打),
              walks_allowed: toNumber(row.四球),
              strikeouts: toNumber(row.奪三振 ?? row.三振),
              earned_runs: toNumber(row.自責点),
              era: computed?.era ?? null,
              whip: computed?.whip ?? null,
              strikeouts_per_nine: computed?.strikeoutsPerNine ?? null,
              walks_per_nine: computed?.walksPerNine ?? null,
              strikeout_to_walk_ratio: computed?.strikeoutToWalkRatio ?? null,
            })
            .execute();
          pitchingRows += 1;
        }
      }
    });
    return { players: players.length, battingRows, pitchingRows };
  } finally {
    await db.destroy();
  }
}
