import BetterSqlite3 from "better-sqlite3";
import { Kysely, SqliteDialect, sql } from "kysely";

export interface ScrapeRunsTable {
  id: string;
  source: string;
  started_at: string;
  completed_at: string | null;
  player_count: number;
}

export interface RawPlayersTable {
  run_id: string;
  player_id: string;
  player_url: string;
  player_name: string;
  kana_name: string;
  is_active: number;
  profile_json: string;
  batting_stats_json: string;
  pitching_stats_json: string;
}

export interface RawDatabaseSchema {
  scrape_runs: ScrapeRunsTable;
  raw_players: RawPlayersTable;
}

export function createRawKyselyDb(dbPath: string): Kysely<RawDatabaseSchema> {
  const sqlite = new BetterSqlite3(dbPath);
  return new Kysely<RawDatabaseSchema>({
    dialect: new SqliteDialect({ database: sqlite }),
  });
}

export async function createRawSchema(
  db: Kysely<RawDatabaseSchema>,
): Promise<void> {
  await sql`PRAGMA foreign_keys = ON`.execute(db);
  await db.schema
    .createTable("scrape_runs")
    .ifNotExists()
    .addColumn("id", "text", (column) => column.primaryKey())
    .addColumn("source", "text", (column) => column.notNull())
    .addColumn("started_at", "text", (column) => column.notNull())
    .addColumn("completed_at", "text")
    .addColumn("player_count", "integer", (column) => column.notNull())
    .execute();

  await db.schema
    .createTable("raw_players")
    .ifNotExists()
    .addColumn("run_id", "text", (column) =>
      column.notNull().references("scrape_runs.id").onDelete("cascade"),
    )
    .addColumn("player_id", "text", (column) => column.notNull())
    .addColumn("player_url", "text", (column) => column.notNull())
    .addColumn("player_name", "text", (column) => column.notNull())
    .addColumn("kana_name", "text", (column) => column.notNull())
    .addColumn("is_active", "integer", (column) => column.notNull())
    .addColumn("profile_json", "text", (column) => column.notNull())
    .addColumn("batting_stats_json", "text", (column) => column.notNull())
    .addColumn("pitching_stats_json", "text", (column) => column.notNull())
    .addPrimaryKeyConstraint("raw_players_pk", ["run_id", "player_id"])
    .execute();

  await db.schema
    .createIndex("idx_raw_players_player")
    .ifNotExists()
    .on("raw_players")
    .column("player_id")
    .execute();
}
