import { describe, expect, it } from "vitest";
import { buildReleaseMetadata } from "./release-metadata.js";

const counts = { players: 3, battingRows: 5, pitchingRows: 2 };

describe("buildReleaseMetadata", () => {
  it("maps counts and provenance into the published metadata shape", () => {
    const generatedAt = new Date("2026-08-20T03:00:00.000Z");

    const metadata = buildReleaseMetadata(counts, {
      sourceSha: "abc123",
      sourceRunId: 42,
      scope: "daily",
      generatedAt,
    });

    expect(metadata).toEqual({
      source_sha: "abc123",
      source_run_id: 42,
      generated_at: "2026-08-20T03:00:00.000Z",
      scope: "daily",
      players: 3,
      batting_rows: 5,
      pitching_rows: 2,
    });
  });

  it("defaults generated_at to the current time", () => {
    const before = Date.now();
    const metadata = buildReleaseMetadata(counts, {
      sourceSha: "abc123",
      sourceRunId: 1,
      scope: "active",
    });
    const after = Date.now();

    const generatedAtMs = new Date(metadata.generated_at).getTime();
    expect(generatedAtMs).toBeGreaterThanOrEqual(before);
    expect(generatedAtMs).toBeLessThanOrEqual(after);
  });

  it.each([
    [{ sourceSha: "", sourceRunId: 1, scope: "active" }, /sourceSha/],
    [{ sourceSha: "abc", sourceRunId: 0, scope: "active" }, /sourceRunId/],
    [{ sourceSha: "abc", sourceRunId: 1, scope: "" }, /scope/],
  ])("rejects invalid input %#", (input, message) => {
    expect(() => buildReleaseMetadata(counts, input)).toThrow(message);
  });
});
