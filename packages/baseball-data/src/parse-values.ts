export function toNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[，,]/g, "").trim();
  if (!normalized || normalized === "-" || normalized === "----") {
    return null;
  }

  const numeric = Number(
    normalized.startsWith(".") ? `0${normalized}` : normalized,
  );
  return Number.isFinite(numeric) ? numeric : null;
}

export function parseSeason(row: { 年度?: string }): number | null {
  const season = toNumber(row.年度);
  return season === null ? null : Math.trunc(season);
}

export function parseInnings(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s/g, "");
  const [whole, fraction] = normalized.split(".");
  const base = Number(whole);
  if (!Number.isFinite(base)) {
    return null;
  }

  if (fraction === "1") {
    return base + 1 / 3;
  }
  if (fraction === "2") {
    return base + 2 / 3;
  }
  return base;
}

export function round(value: number | null, digits = 3): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? round(numerator / denominator) : null;
}

export function addNullable(
  left: number | null,
  right: number | null,
): number | null {
  return left !== null && right !== null ? round(left + right) : null;
}

export function subtractNullable(
  left: number | null,
  right: number | null,
): number | null {
  return left !== null && right !== null ? round(left - right) : null;
}
