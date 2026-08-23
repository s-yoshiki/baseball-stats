import BetterSqlite3 from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { createRawSchema, type RawDatabaseSchema } from "./raw-schema.js";

async function main(): Promise<void> {
  const sqlite = new BetterSqlite3(":memory:");
  const db = new Kysely<RawDatabaseSchema>({
    dialect: new SqliteDialect({ database: sqlite }),
  });
  await createRawSchema(db);
  await writeSchema(sqlite);
  await db.destroy();
}

async function writeSchema(sqlite: BetterSqlite3.Database): Promise<void> {
  const statements = sqlite
    .prepare(
      `SELECT sql
       FROM sqlite_master
       WHERE sql IS NOT NULL
         AND name NOT LIKE 'sqlite_%'
       ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name`,
    )
    .all() as Array<{ sql: string }>;
  process.stdout.write(
    `${statements.map((statement) => `${statement.sql};`).join("\n\n")}\n`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
