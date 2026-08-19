import type { PlayerDetails } from "./types.js";

function text(value: string | undefined): string | null {
  const normalized = value?.normalize("NFKC").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function number(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseHeightWeight(value: string | undefined): {
  heightCm: number | null;
  weightKg: number | null;
} {
  const match = value?.match(/(\d+)\s*cm\s*[／/]\s*(\d+)\s*kg/i);
  return {
    heightCm: number(match?.[1]),
    weightKg: number(match?.[2]),
  };
}

function parseBirthDate(value: string | undefined): PlayerDetails["birthDate"] {
  const match = value?.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  const year = number(match?.[1]);
  const month = number(match?.[2]);
  const day = number(match?.[3]);
  return {
    iso:
      year !== null && month !== null && day !== null
        ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : null,
    year,
    month,
    day,
  };
}

function parseCareer(value: string | undefined): PlayerDetails["career"] {
  const raw = text(value);
  return {
    raw,
    entries: raw ? raw.split(/\s+-\s+/).map((entry) => entry.trim()) : [],
  };
}

function parseDraft(value: string | undefined): PlayerDetails["draft"] {
  const raw = text(value);
  const year = number(raw?.match(/(\d{4})年/)?.[1]);
  const rank = number(raw?.match(/(\d+)(?:位|巡目)/)?.[1]);
  let selection: PlayerDetails["draft"]["selection"] = null;
  if (raw?.includes("ドラフト外")) {
    selection = "outside";
  } else if (raw?.includes("育成")) {
    selection = "development";
  } else if (raw?.includes("ドラフト")) {
    selection = "regular";
  }
  return { raw, year, rank, selection };
}

export function parsePlayerDetails(
  detailInfo: Record<string, string>,
): PlayerDetails {
  const batsThrows = text(detailInfo.投打);
  const match = batsThrows?.match(/^([左右])投([左右])打$/);
  const { heightCm, weightKg } = parseHeightWeight(
    detailInfo["身長／体重"] ?? detailInfo["身長/体重"],
  );

  return {
    position: text(detailInfo.ポジション ?? detailInfo.守備位置),
    throws: match?.[1] ?? null,
    bats: match?.[2] ?? null,
    heightCm,
    weightKg,
    birthDate: parseBirthDate(detailInfo.生年月日),
    career: parseCareer(detailInfo.経歴),
    draft: parseDraft(detailInfo.ドラフト),
  };
}
