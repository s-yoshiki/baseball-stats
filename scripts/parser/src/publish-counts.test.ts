import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readPublishedCounts } from "./publish-counts.js";

let dir: string;
let dbPath: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "publish-counts-"));
  dbPath = path.join(dir, "data.sqlite");

  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE players (id TEXT PRIMARY KEY);
    CREATE TABLE batting_stats (id INTEGER PRIMARY KEY, player_id TEXT);
    CREATE TABLE pitching_stats (id INTEGER PRIMARY KEY, player_id TEXT);
    INSERT INTO players (id) VALUES ('p1'), ('p2');
    INSERT INTO batting_stats (player_id) VALUES ('p1'), ('p1'), ('p2');
    INSERT INTO pitching_stats (player_id) VALUES ('p2');
  `);
  db.close();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("readPublishedCounts", () => {
  it("counts rows in the published tables", () => {
    expect(readPublishedCounts(dbPath)).toEqual({
      players: 2,
      battingRows: 3,
      pitchingRows: 1,
    });
  });

  it("throws when the file is not a valid SQLite database", async () => {
    const corruptPath = path.join(dir, "corrupt.sqlite");
    await writeFile(corruptPath, "not a sqlite file");

    expect(() => readPublishedCounts(corruptPath)).toThrow();
  });
});
