import type { RawCounts } from "./publish-counts.js";

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
  runs: number;
};

/**
 * Builds the `metadata.json` asset published alongside `raw.sqlite` on the
 * GitHub Pages site. `npb-analysis` reads this to record provenance and to
 * sanity-check the download without re-deriving counts itself.
 */
export function buildReleaseMetadata(
  counts: RawCounts,
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
    runs: counts.runs,
  };
}
