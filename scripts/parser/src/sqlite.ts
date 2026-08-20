import path from "node:path";
import {
  calculatePlayerStats,
  createSnapshot,
  type EnrichedPlayer,
  type EnrichedSnapshot,
  loadMasterData,
  parseInnings,
  parsePlayerDetails,
  parsePlayerName,
  type RawPlayer,
  resolveSchool,
  resolveTeamSeason,
  toNumber,
} from "@repo/baseball-data";
import BetterSqlite3 from "better-sqlite3";
import { type Generated, Kysely, SqliteDialect, sql } from "kysely";
import { readLatestRawPlayers } from "./raw-sqlite.js";

export interface PlayersTable {
  id: string;
  player_name: string;
  kana_name: string;
  registered_name: string;
  family_name: string | null;
  given_name: string | null;
  family_name_kana: string | null;
  given_name_kana: string | null;
  registered_name_kana: string;
  player_url: string;
  is_active: number;
  team: string | null;
  position: string | null;
  bats_throws: string | null;
  height_weight: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  birth_date_iso: string | null;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  birth_place: string | null;
  career: string | null;
  draft: string | null;
  detail_json: string;
  created_at: Generated<string>;
}

export interface BattingStatsTable {
  id: Generated<number>;
  player_id: string;
  season: number | null;
  team: string | null;
  team_id: string | null;
  league_id: "one_league" | "central" | "pacific" | null;
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
  caught_stealing: number | null;
  sacrifice_hits: number | null;
  sacrifice_flies: number | null;
  walks: number | null;
  hit_by_pitch: number | null;
  strikeouts: number | null;
  grounded_into_double_plays: number | null;
  batting_average: number | null;
  on_base_percentage: number | null;
  slugging_percentage: number | null;
  ops: number | null;
  iso: number | null;
  walk_percentage: number | null;
  strikeout_percentage: number | null;
  babip: number | null;
  stolen_base_success_percentage: number | null;
  home_run_percentage: number | null;
  extra_base_hit_percentage: number | null;
  runs_per_plate_appearance: number | null;
  rbi_per_plate_appearance: number | null;
  walk_to_strikeout_ratio: number | null;
}

export interface PitchingStatsTable {
  id: Generated<number>;
  player_id: string;
  season: number | null;
  team: string | null;
  team_id: string | null;
  league_id: "one_league" | "central" | "pacific" | null;
  games: number | null;
  wins: number | null;
  losses: number | null;
  saves: number | null;
  holds: number | null;
  hold_points: number | null;
  complete_games: number | null;
  shutouts: number | null;
  no_walk_complete_games: number | null;
  winning_percentage: number | null;
  batters_faced: number | null;
  innings: number | null;
  hits_allowed: number | null;
  home_runs_allowed: number | null;
  walks_allowed: number | null;
  hit_by_pitch: number | null;
  strikeouts: number | null;
  wild_pitches: number | null;
  balks: number | null;
  runs_allowed: number | null;
  earned_runs: number | null;
  era: number | null;
  whip: number | null;
  strikeouts_per_nine: number | null;
  walks_per_nine: number | null;
  strikeout_to_walk_ratio: number | null;
  hits_per_nine: number | null;
  home_runs_per_nine: number | null;
  runs_per_nine: number | null;
  strikeout_percentage: number | null;
  walk_percentage: number | null;
  strikeout_minus_walk_percentage: number | null;
}

export interface LeaguesTable {
  id: string;
  name: string;
  short_name: string;
  start_season: number;
  end_season: number | null;
}

export interface TeamsTable {
  id: string;
  current_name: string;
  current_league_id: "central" | "pacific" | null;
  founded_season: number | null;
  dissolved_season: number | null;
}

export interface TeamSeasonsTable {
  team_id: string;
  season: number;
  league_id: "one_league" | "central" | "pacific";
  name: string;
}

export interface SchoolsTable {
  id: string;
  name: string;
  normalized_name: string;
  kind: "high_school" | "university" | "other";
}

export interface PlayerSchoolsTable {
  player_id: string;
  school_id: string;
  sequence: number;
  raw_name: string;
}

export interface DatabaseSchema {
  players: PlayersTable;
  batting_stats: BattingStatsTable;
  pitching_stats: PitchingStatsTable;
  leagues: LeaguesTable;
  teams: TeamsTable;
  team_seasons: TeamSeasonsTable;
  schools: SchoolsTable;
  player_schools: PlayerSchoolsTable;
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
    .addColumn("registered_name", "text", (column) => column.notNull())
    .addColumn("family_name", "text")
    .addColumn("given_name", "text")
    .addColumn("family_name_kana", "text")
    .addColumn("given_name_kana", "text")
    .addColumn("registered_name_kana", "text", (column) => column.notNull())
    .addColumn("player_url", "text", (column) => column.notNull())
    .addColumn("is_active", "integer", (column) => column.notNull())
    .addColumn("team", "text")
    .addColumn("position", "text")
    .addColumn("bats_throws", "text")
    .addColumn("height_weight", "text")
    .addColumn("height_cm", "integer")
    .addColumn("weight_kg", "integer")
    .addColumn("birth_date", "text")
    .addColumn("birth_date_iso", "text")
    .addColumn("birth_year", "integer")
    .addColumn("birth_month", "integer")
    .addColumn("birth_day", "integer")
    .addColumn("birth_place", "text")
    .addColumn("career", "text")
    .addColumn("draft", "text")
    .addColumn("detail_json", "text", (column) => column.notNull())
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
    .addColumn("team_id", "text")
    .addColumn("league_id", "text")
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
    .addColumn("caught_stealing", "integer")
    .addColumn("sacrifice_hits", "integer")
    .addColumn("sacrifice_flies", "integer")
    .addColumn("walks", "integer")
    .addColumn("hit_by_pitch", "integer")
    .addColumn("strikeouts", "integer")
    .addColumn("grounded_into_double_plays", "integer")
    .addColumn("batting_average", "real")
    .addColumn("on_base_percentage", "real")
    .addColumn("slugging_percentage", "real")
    .addColumn("ops", "real")
    .addColumn("iso", "real")
    .addColumn("walk_percentage", "real")
    .addColumn("strikeout_percentage", "real")
    .addColumn("babip", "real")
    .addColumn("stolen_base_success_percentage", "real")
    .addColumn("home_run_percentage", "real")
    .addColumn("extra_base_hit_percentage", "real")
    .addColumn("runs_per_plate_appearance", "real")
    .addColumn("rbi_per_plate_appearance", "real")
    .addColumn("walk_to_strikeout_ratio", "real")
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
    .addColumn("team_id", "text")
    .addColumn("league_id", "text")
    .addColumn("games", "integer")
    .addColumn("wins", "integer")
    .addColumn("losses", "integer")
    .addColumn("saves", "integer")
    .addColumn("holds", "integer")
    .addColumn("hold_points", "integer")
    .addColumn("complete_games", "integer")
    .addColumn("shutouts", "integer")
    .addColumn("no_walk_complete_games", "integer")
    .addColumn("winning_percentage", "real")
    .addColumn("batters_faced", "integer")
    .addColumn("innings", "real")
    .addColumn("hits_allowed", "integer")
    .addColumn("home_runs_allowed", "integer")
    .addColumn("walks_allowed", "integer")
    .addColumn("hit_by_pitch", "integer")
    .addColumn("strikeouts", "integer")
    .addColumn("wild_pitches", "integer")
    .addColumn("balks", "integer")
    .addColumn("runs_allowed", "integer")
    .addColumn("earned_runs", "integer")
    .addColumn("era", "real")
    .addColumn("whip", "real")
    .addColumn("strikeouts_per_nine", "real")
    .addColumn("walks_per_nine", "real")
    .addColumn("strikeout_to_walk_ratio", "real")
    .addColumn("hits_per_nine", "real")
    .addColumn("home_runs_per_nine", "real")
    .addColumn("runs_per_nine", "real")
    .addColumn("strikeout_percentage", "real")
    .addColumn("walk_percentage", "real")
    .addColumn("strikeout_minus_walk_percentage", "real")
    .execute();

  await db.schema
    .createTable("leagues")
    .ifNotExists()
    .addColumn("id", "text", (column) => column.primaryKey())
    .addColumn("name", "text", (column) => column.notNull())
    .addColumn("short_name", "text", (column) => column.notNull())
    .addColumn("start_season", "integer", (column) => column.notNull())
    .addColumn("end_season", "integer")
    .execute();

  await db.schema
    .createTable("teams")
    .ifNotExists()
    .addColumn("id", "text", (column) => column.primaryKey())
    .addColumn("current_name", "text", (column) => column.notNull())
    .addColumn("current_league_id", "text")
    .addColumn("founded_season", "integer")
    .addColumn("dissolved_season", "integer")
    .execute();

  await db.schema
    .createTable("team_seasons")
    .ifNotExists()
    .addColumn("team_id", "text", (column) => column.notNull())
    .addColumn("season", "integer", (column) => column.notNull())
    .addColumn("league_id", "text", (column) => column.notNull())
    .addColumn("name", "text", (column) => column.notNull())
    .addPrimaryKeyConstraint("team_seasons_pk", ["team_id", "season"])
    .execute();

  await db.schema
    .createTable("schools")
    .ifNotExists()
    .addColumn("id", "text", (column) => column.primaryKey())
    .addColumn("name", "text", (column) => column.notNull())
    .addColumn("normalized_name", "text", (column) => column.notNull())
    .addColumn("kind", "text", (column) => column.notNull())
    .execute();

  await db.schema
    .createTable("player_schools")
    .ifNotExists()
    .addColumn("player_id", "text", (column) => column.notNull())
    .addColumn("school_id", "text", (column) => column.notNull())
    .addColumn("sequence", "integer", (column) => column.notNull())
    .addColumn("raw_name", "text", (column) => column.notNull())
    .addPrimaryKeyConstraint("player_schools_pk", [
      "player_id",
      "school_id",
      "sequence",
    ])
    .execute();

  // Keep existing local SQLite files usable after adding the master columns.
  for (const statement of [
    sql`ALTER TABLE players ADD COLUMN registered_name TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE players ADD COLUMN family_name TEXT`,
    sql`ALTER TABLE players ADD COLUMN given_name TEXT`,
    sql`ALTER TABLE players ADD COLUMN family_name_kana TEXT`,
    sql`ALTER TABLE players ADD COLUMN given_name_kana TEXT`,
    sql`ALTER TABLE players ADD COLUMN registered_name_kana TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE players ADD COLUMN bats_throws TEXT`,
    sql`ALTER TABLE players ADD COLUMN height_weight TEXT`,
    sql`ALTER TABLE players ADD COLUMN height_cm INTEGER`,
    sql`ALTER TABLE players ADD COLUMN weight_kg INTEGER`,
    sql`ALTER TABLE players ADD COLUMN birth_date TEXT`,
    sql`ALTER TABLE players ADD COLUMN birth_date_iso TEXT`,
    sql`ALTER TABLE players ADD COLUMN birth_year INTEGER`,
    sql`ALTER TABLE players ADD COLUMN birth_month INTEGER`,
    sql`ALTER TABLE players ADD COLUMN birth_day INTEGER`,
    sql`ALTER TABLE players ADD COLUMN birth_place TEXT`,
    sql`ALTER TABLE players ADD COLUMN career TEXT`,
    sql`ALTER TABLE players ADD COLUMN draft TEXT`,
    sql`ALTER TABLE batting_stats ADD COLUMN team_id TEXT`,
    sql`ALTER TABLE batting_stats ADD COLUMN league_id TEXT`,
    sql`ALTER TABLE batting_stats ADD COLUMN caught_stealing INTEGER`,
    sql`ALTER TABLE batting_stats ADD COLUMN sacrifice_hits INTEGER`,
    sql`ALTER TABLE batting_stats ADD COLUMN sacrifice_flies INTEGER`,
    sql`ALTER TABLE batting_stats ADD COLUMN grounded_into_double_plays INTEGER`,
    sql`ALTER TABLE batting_stats ADD COLUMN babip REAL`,
    sql`ALTER TABLE batting_stats ADD COLUMN stolen_base_success_percentage REAL`,
    sql`ALTER TABLE batting_stats ADD COLUMN home_run_percentage REAL`,
    sql`ALTER TABLE batting_stats ADD COLUMN extra_base_hit_percentage REAL`,
    sql`ALTER TABLE batting_stats ADD COLUMN runs_per_plate_appearance REAL`,
    sql`ALTER TABLE batting_stats ADD COLUMN rbi_per_plate_appearance REAL`,
    sql`ALTER TABLE batting_stats ADD COLUMN walk_to_strikeout_ratio REAL`,
    sql`ALTER TABLE pitching_stats ADD COLUMN team_id TEXT`,
    sql`ALTER TABLE pitching_stats ADD COLUMN league_id TEXT`,
    sql`ALTER TABLE pitching_stats ADD COLUMN hold_points INTEGER`,
    sql`ALTER TABLE pitching_stats ADD COLUMN complete_games INTEGER`,
    sql`ALTER TABLE pitching_stats ADD COLUMN shutouts INTEGER`,
    sql`ALTER TABLE pitching_stats ADD COLUMN no_walk_complete_games INTEGER`,
    sql`ALTER TABLE pitching_stats ADD COLUMN winning_percentage REAL`,
    sql`ALTER TABLE pitching_stats ADD COLUMN batters_faced INTEGER`,
    sql`ALTER TABLE pitching_stats ADD COLUMN home_runs_allowed INTEGER`,
    sql`ALTER TABLE pitching_stats ADD COLUMN hit_by_pitch INTEGER`,
    sql`ALTER TABLE pitching_stats ADD COLUMN wild_pitches INTEGER`,
    sql`ALTER TABLE pitching_stats ADD COLUMN balks INTEGER`,
    sql`ALTER TABLE pitching_stats ADD COLUMN runs_allowed INTEGER`,
    sql`ALTER TABLE pitching_stats ADD COLUMN hits_per_nine REAL`,
    sql`ALTER TABLE pitching_stats ADD COLUMN home_runs_per_nine REAL`,
    sql`ALTER TABLE pitching_stats ADD COLUMN runs_per_nine REAL`,
    sql`ALTER TABLE pitching_stats ADD COLUMN strikeout_percentage REAL`,
    sql`ALTER TABLE pitching_stats ADD COLUMN walk_percentage REAL`,
    sql`ALTER TABLE pitching_stats ADD COLUMN strikeout_minus_walk_percentage REAL`,
  ]) {
    try {
      await statement.execute(db);
    } catch {
      // SQLite raises a duplicate-column error when the column already exists.
    }
  }

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
  await sql`CREATE INDEX IF NOT EXISTS idx_batting_season_league ON batting_stats(season, league_id)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_pitching_season_league ON pitching_stats(season, league_id)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_players_registered_name ON players(registered_name)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_players_birth_year ON players(birth_year)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_players_height_cm ON players(height_cm)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_batting_season_team ON batting_stats(season, team_id)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_pitching_season_team ON pitching_stats(season, team_id)`.execute(
    db,
  );
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_team_seasons_name_season ON team_seasons(name, season)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_schools_normalized_name ON schools(normalized_name)`.execute(
    db,
  );
  await sql`CREATE INDEX IF NOT EXISTS idx_player_schools_player ON player_schools(player_id)`.execute(
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

async function replaceMasterData(
  db: Kysely<DatabaseSchema>,
  masterData: Awaited<ReturnType<typeof loadMasterData>>,
): Promise<void> {
  await db.deleteFrom("player_schools").execute();
  await db.deleteFrom("schools").execute();
  await db.deleteFrom("team_seasons").execute();
  await db.deleteFrom("teams").execute();
  await db.deleteFrom("leagues").execute();

  for (const league of masterData.leagues) {
    await db
      .insertInto("leagues")
      .values({
        id: league.id,
        name: league.attributes.name,
        short_name: league.attributes.shortName,
        start_season: league.attributes.startSeason,
        end_season: league.attributes.endSeason,
      })
      .execute();
  }

  for (const team of masterData.teams) {
    await db
      .insertInto("teams")
      .values({
        id: team.id,
        current_name: team.attributes.currentName,
        current_league_id: team.attributes.currentLeagueId,
        founded_season: team.attributes.foundedSeason,
        dissolved_season: team.attributes.dissolvedSeason,
      })
      .execute();
  }

  const openSeasonEnd = new Date().getFullYear() + 5;
  for (const teamName of masterData.teamNames) {
    const attributes = teamName.attributes;
    const endSeason = attributes.endSeason ?? openSeasonEnd;
    for (
      let season = attributes.startSeason;
      season <= endSeason;
      season += 1
    ) {
      await db
        .insertInto("team_seasons")
        .values({
          team_id: attributes.teamId,
          season,
          league_id: attributes.leagueId,
          name: attributes.name,
        })
        .execute();
    }
  }

  for (const school of masterData.schools) {
    await db
      .insertInto("schools")
      .values({
        id: school.id,
        name: school.attributes.name,
        normalized_name: school.attributes.normalizedName,
        kind: school.attributes.kind,
      })
      .execute();
  }
}

export async function writeSnapshotToSqlite(
  snapshot: EnrichedSnapshot,
  dbPath: string,
  masterDir = path.resolve(process.cwd(), "../../data/masters"),
): Promise<{ players: number; battingRows: number; pitchingRows: number }> {
  const db = createKyselyDb(dbPath);
  try {
    await createSchema(db);
    const masterData = await loadMasterData(masterDir);
    const players = snapshot.players.map((player) =>
      isEnrichedPlayer(player) ? player : calculatePlayerStats(player),
    );

    let battingRows = 0;
    let pitchingRows = 0;
    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom("batting_stats").execute();
      await trx.deleteFrom("pitching_stats").execute();
      await trx.deleteFrom("players").execute();
      await replaceMasterData(trx, masterData);

      for (const player of players) {
        const name = parsePlayerName(player.playerName, player.kanaName);
        const details =
          player.profileDetails ?? parsePlayerDetails(player.detailInfo);
        const heightWeight =
          detail(player, "身長／体重") ?? detail(player, "身長/体重");
        const birthDate = detail(player, "生年月日");
        const batsThrows =
          details.throws || details.bats
            ? `${details.throws ?? ""}投${details.bats ?? ""}打`
            : null;
        await trx
          .insertInto("players")
          .values({
            id: player.id,
            player_name: player.playerName,
            kana_name: player.kanaName,
            registered_name: name.registeredName,
            family_name: name.familyName,
            given_name: name.givenName,
            family_name_kana: name.familyNameKana,
            given_name_kana: name.givenNameKana,
            registered_name_kana: name.registeredNameKana,
            player_url: player.playerUrl,
            is_active: player.isActive ? 1 : 0,
            team: detail(player, "所属球団"),
            position: detail(player, "守備位置"),
            bats_throws: batsThrows,
            height_weight: heightWeight,
            height_cm: details.heightCm,
            weight_kg: details.weightKg,
            birth_date: birthDate,
            birth_date_iso: details.birthDate.iso,
            birth_year: details.birthDate.year,
            birth_month: details.birthDate.month,
            birth_day: details.birthDate.day,
            birth_place: detail(player, "出身地"),
            career: details.career.raw,
            draft: details.draft.raw,
            detail_json: JSON.stringify(details),
          })
          .execute();

        for (const [index, careerEntry] of parsePlayerDetails(
          player.detailInfo,
        ).career.entries.entries()) {
          const school = resolveSchool(careerEntry, masterData);
          if (!school) continue;
          await trx
            .insertInto("player_schools")
            .values({
              player_id: player.id,
              school_id: school.id,
              sequence: index + 1,
              raw_name: careerEntry,
            })
            .execute();
        }

        const battingComputed = player.computedStats.batting;
        for (const [index, row] of player.battingStats.entries()) {
          const computed = battingComputed[index];
          const season = toNumber(row.season);
          const team = row.team?.trim() || null;
          const resolvedTeam = resolveTeamSeason(team, season, masterData);
          await trx
            .insertInto("batting_stats")
            .values({
              player_id: player.id,
              season,
              team,
              team_id: resolvedTeam?.teamId ?? null,
              league_id: resolvedTeam?.leagueId ?? null,
              games: toNumber(row.games),
              plate_appearances: toNumber(row.plateAppearances),
              at_bats: toNumber(row.atBats),
              runs: toNumber(row.runs),
              hits: toNumber(row.hits),
              doubles: toNumber(row.doubles),
              triples: toNumber(row.triples),
              home_runs: toNumber(row.homeRuns),
              total_bases: toNumber(row.totalBases),
              rbi: toNumber(row.rbi),
              steals: toNumber(row.steals),
              caught_stealing: toNumber(row.caughtStealing),
              sacrifice_hits: toNumber(row.sacrificeHits),
              sacrifice_flies: toNumber(row.sacrificeFlies),
              walks: toNumber(row.walks),
              hit_by_pitch: toNumber(row.hitByPitch),
              strikeouts: toNumber(row.strikeouts),
              grounded_into_double_plays: toNumber(row.groundedIntoDoublePlays),
              batting_average: computed?.battingAverage ?? null,
              on_base_percentage: computed?.onBasePercentage ?? null,
              slugging_percentage: computed?.sluggingPercentage ?? null,
              ops: computed?.ops ?? null,
              iso: computed?.iso ?? null,
              walk_percentage: computed?.walkPercentage ?? null,
              strikeout_percentage: computed?.strikeoutPercentage ?? null,
              babip: computed?.babip ?? null,
              stolen_base_success_percentage:
                computed?.stolenBaseSuccessPercentage ?? null,
              home_run_percentage: computed?.homeRunPercentage ?? null,
              extra_base_hit_percentage:
                computed?.extraBaseHitPercentage ?? null,
              runs_per_plate_appearance:
                computed?.runsPerPlateAppearance ?? null,
              rbi_per_plate_appearance: computed?.rbiPerPlateAppearance ?? null,
              walk_to_strikeout_ratio: computed?.walkToStrikeoutRatio ?? null,
            })
            .execute();
          battingRows += 1;
        }

        const pitchingComputed = player.computedStats.pitching;
        for (const [index, row] of player.pitchingStats.entries()) {
          const computed = pitchingComputed[index];
          const season = toNumber(row.season);
          const team = row.team?.trim() || null;
          const resolvedTeam = resolveTeamSeason(team, season, masterData);
          await trx
            .insertInto("pitching_stats")
            .values({
              player_id: player.id,
              season,
              team,
              team_id: resolvedTeam?.teamId ?? null,
              league_id: resolvedTeam?.leagueId ?? null,
              games: toNumber(row.games),
              wins: toNumber(row.wins),
              losses: toNumber(row.losses),
              saves: toNumber(row.saves),
              holds: toNumber(row.holds),
              hold_points: toNumber(row.holdPoints),
              complete_games: toNumber(row.completeGames),
              shutouts: toNumber(row.shutouts),
              no_walk_complete_games: toNumber(row.noWalkCompleteGames),
              winning_percentage: computed?.winningPercentage ?? null,
              batters_faced: toNumber(row.battersFaced),
              innings: parseInnings(row.innings),
              hits_allowed: toNumber(row.hitsAllowed),
              home_runs_allowed: toNumber(row.homeRunsAllowed),
              walks_allowed: toNumber(row.walksAllowed),
              hit_by_pitch: toNumber(row.hitByPitch),
              strikeouts: toNumber(row.strikeouts),
              wild_pitches: toNumber(row.wildPitches),
              balks: toNumber(row.balks),
              runs_allowed: toNumber(row.runsAllowed),
              earned_runs: toNumber(row.earnedRuns),
              era: computed?.era ?? null,
              whip: computed?.whip ?? null,
              strikeouts_per_nine: computed?.strikeoutsPerNine ?? null,
              walks_per_nine: computed?.walksPerNine ?? null,
              strikeout_to_walk_ratio: computed?.strikeoutToWalkRatio ?? null,
              hits_per_nine: computed?.hitsPerNine ?? null,
              home_runs_per_nine: computed?.homeRunsPerNine ?? null,
              runs_per_nine: computed?.runsPerNine ?? null,
              strikeout_percentage: computed?.strikeoutPercentage ?? null,
              walk_percentage: computed?.walkPercentage ?? null,
              strikeout_minus_walk_percentage:
                computed?.strikeoutMinusWalkPercentage ?? null,
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

export async function writeRawSqliteToSqlite(
  rawDbPath: string,
  dbPath: string,
  masterDir = path.resolve(process.cwd(), "../../data/masters"),
): Promise<{ players: number; battingRows: number; pitchingRows: number }> {
  const rawPlayers = await readLatestRawPlayers(rawDbPath);
  const snapshot = createSnapshot(
    "calculate",
    rawPlayers.map(calculatePlayerStats),
  );
  return writeSnapshotToSqlite(snapshot, dbPath, masterDir);
}
