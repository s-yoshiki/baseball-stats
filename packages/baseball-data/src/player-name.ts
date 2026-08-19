import type { PlayerName } from "./types.js";

export function normalizePlayerText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function splitParts(
  value: string,
  separator: RegExp,
): { familyName: string | null; givenName: string | null } {
  const tokens = value.split(separator).filter(Boolean);
  return {
    familyName: tokens[0] ?? null,
    givenName: tokens.length > 1 ? tokens.slice(1).join(" ") : null,
  };
}

function splitRegisteredName(value: string): {
  registeredName: string;
  nameForParts: string;
} {
  const normalized = normalizePlayerText(value);
  const match = normalized.match(/^(.+?)\s*[（(](.+?)[）)]\s*$/);
  return {
    registeredName: normalizePlayerText(match?.[1] ?? normalized),
    nameForParts: normalizePlayerText(match?.[2] ?? normalized),
  };
}

export function parsePlayerName(
  playerName: string,
  kanaName: string,
): PlayerName {
  const name = splitRegisteredName(playerName);
  const kana = splitRegisteredName(kanaName);
  const nameParts = splitParts(name.nameForParts, /\s+/);
  const kanaParts = splitParts(kana.nameForParts, /[・･\s]+/);

  return {
    familyName: nameParts.familyName,
    givenName: nameParts.givenName,
    familyNameKana: kanaParts.familyName,
    givenNameKana: kanaParts.givenName,
    registeredName: name.registeredName,
    registeredNameKana: kana.registeredName,
  };
}
