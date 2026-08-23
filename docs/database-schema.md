# SQLite schema

`data/raw/raw.sqlite` is the scrape store and the canonical dataset this
repository owns and publishes. It keeps one `raw_players` row per player and
run, with the original normalized stat rows in JSON columns. It is
append-only at the run level.

## Tables

```text
scrape_runs(id, source, started_at, completed_at, player_count)
raw_players(
  run_id, player_id, player_url, player_name, kana_name, is_active,
  profile_json, batting_stats_json, pitching_stats_json
)
```

- `scrape_runs`: one row per scrape execution. `completed_at` is `NULL` while
  the run is in progress; a run is only considered when reading the latest
  per-player state once it is set.
- `raw_players`: one row per `(run_id, player_id)`. `profile_json`,
  `batting_stats_json`, and `pitching_stats_json` are JSON-encoded strings,
  not typed columns — this table is a scrape log, not a query schema.

`profile_json` holds `position`, `batsThrows`, `heightWeight`, `birthDate`,
`career`, `draft`, and an `additional` array of `{ sourceKey, value }` pairs
for profile fields that are not recognized. `batting_stats_json` and
`pitching_stats_json` are arrays of row objects whose keys are the English
names normalized from NPB's Japanese headers (for example `年度` → `season`,
`安打` → `hits`, `投球回` → `innings`, `自責点` → `earnedRuns`). Values are
kept as the strings NPB displays them as; no numeric parsing or derived
metric calculation happens in this repository.

Reading the latest state for each player means selecting, for every
`player_id`, the row from the most recently completed run that includes it.
This lets a `daily`-scope run that only re-scrapes active and newly indexed
players still produce a complete "current state" view without losing
previously scraped retired players.

## What is intentionally not here

Derived metrics (batting average, ERA, OPS, and similar calculated values),
name normalization (splitting a display name into family/given name and
kana), team/school master resolution, and a queryable application schema are
not part of this database. That processing now lives in `npb-analysis`,
which fetches `raw.sqlite` from this repository's GitHub Pages site and
builds its own application database from it. See
[ADR 0007](adr/0007-raw-only-scope-and-pages-publish-raw-sqlite.md) for the
rationale.
