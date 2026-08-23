import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readRawCounts } from "./publish-counts.js";

let dir: string;
let dbPath: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "publish-counts-"));
  dbPath = path.join(dir, "raw.sqlite");

  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE scrape_runs (id TEXT PRIMARY KEY);
    CREATE TABLE raw_players (run_id TEXT, player_id TEXT);
    INSERT INTO scrape_runs (id) VALUES ('run-1'), ('run-2');
    INSERT INTO raw_players (run_id, player_id) VALUES
      ('run-1', 'p1'), ('run-1', 'p2'), ('run-2', 'p1'), ('run-2', 'p3');
  `);
  db.close();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("readRawCounts", () => {
  it("counts distinct players and scrape runs in the raw tables", () => {
    expect(readRawCounts(dbPath)).toEqual({
      players: 3,
      runs: 2,
    });
  });

  it("throws when the file is not a valid SQLite database", async () => {
    const corruptPath = path.join(dir, "corrupt.sqlite");
    await writeFile(corruptPath, "not a sqlite file");

    expect(() => readRawCounts(corruptPath)).toThrow();
  });
});
