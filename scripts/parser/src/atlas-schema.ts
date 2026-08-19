import BetterSqlite3 from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import type { RawDatabaseSchema } from "./raw-schema.js";
import { createRawSchema } from "./raw-schema.js";
import { createSchema, type DatabaseSchema } from "./sqlite.js";

function databaseKind(): "published" | "raw" {
  const index = process.argv.indexOf("--database");
  const value = index === -1 ? "published" : process.argv[index + 1];
  if (value !== "published" && value !== "raw") {
    throw new Error(`--database must be published or raw, received: ${value}`);
  }
  return value;
}

async function main(): Promise<void> {
  const sqlite = new BetterSqlite3(":memory:");
  if (databaseKind() === "published") {
    const db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: sqlite }),
    });
    await createSchema(db);
    await writeSchema(sqlite);
    await db.destroy();
  } else {
    const db = new Kysely<RawDatabaseSchema>({
      dialect: new SqliteDialect({ database: sqlite }),
    });
    await createRawSchema(db);
    await writeSchema(sqlite);
    await db.destroy();
  }
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
