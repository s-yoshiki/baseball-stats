import type { PublishedCounts } from "./publish-counts.js";

export type ReleaseMetadataInput = {
  sourceSha: string;
  sourceRunId: number;
  scope: string;
  /** Defaults to `new Date()`; overridable so tests are deterministic. */
  generatedAt?: Date;
};

export type ReleaseMetadata = {
  source_sha: string;
  source_run_id: number;
  generated_at: string;
  scope: string;
  players: number;
  batting_rows: number;
  pitching_rows: number;
};

/**
 * Builds the `metadata.json` asset published alongside `data.sqlite` on the
 * `db-latest` GitHub Release. `npb-analysis` reads this to record provenance
 * and to sanity-check the download without re-deriving row counts itself.
 */
export function buildReleaseMetadata(
  counts: PublishedCounts,
  input: ReleaseMetadataInput,
): ReleaseMetadata {
  if (!input.sourceSha) throw new Error("sourceSha is required");
  if (!Number.isInteger(input.sourceRunId) || input.sourceRunId <= 0) {
    throw new Error("sourceRunId must be a positive integer");
  }
  if (!input.scope) throw new Error("scope is required");

  return {
    source_sha: input.sourceSha,
    source_run_id: input.sourceRunId,
    generated_at: (input.generatedAt ?? new Date()).toISOString(),
    scope: input.scope,
    players: counts.players,
    batting_rows: counts.battingRows,
    pitching_rows: counts.pitchingRows,
  };
}
