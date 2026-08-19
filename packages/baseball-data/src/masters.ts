import { readFile } from "node:fs/promises";
import path from "node:path";

export type LeagueId = "one_league" | "central" | "pacific";
export type ModernLeagueId = Exclude<LeagueId, "one_league">;
export type SchoolKind = "high_school" | "university" | "other";

export type LeagueMaster = {
  id: string;
  attributes: {
    name: string;
    shortName: string;
    startSeason: number;
    endSeason: number | null;
  };
};

export type TeamMaster = {
  id: string;
  attributes: {
    currentName: string;
    currentLeagueId: ModernLeagueId | null;
    foundedSeason: number | null;
    dissolvedSeason: number | null;
  };
};

export type TeamNameMaster = {
  id: string;
  attributes: {
    teamId: string;
    name: string;
    leagueId: LeagueId;
    startSeason: number;
    endSeason: number | null;
  };
};

export type SchoolMaster = {
  id: string;
  attributes: {
    name: string;
    normalizedName: string;
    kind: SchoolKind;
  };
};

type MasterDocument<T> = {
  data: T[];
};

export type MasterData = {
  leagues: LeagueMaster[];
  teams: TeamMaster[];
  teamNames: TeamNameMaster[];
  schools: SchoolMaster[];
};

export function normalizeMasterName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[・･]/g, "")
    .toLocaleLowerCase("ja");
}

export function classifySchoolKind(name: string): SchoolKind | null {
  const normalized = normalizeMasterName(name);
  const companySuffixes = ["重工", "電工", "鉄工", "建工", "通商"];
  if (companySuffixes.some((suffix) => normalized.endsWith(suffix))) {
    return null;
  }
  if (
    /(高|高校|中|中学|商|工|農|実)$/.test(normalized) ||
    normalized.includes("高等学校")
  ) {
    return "high_school";
  }
  if (
    normalized.includes("短大") ||
    normalized.includes("高専") ||
    normalized.includes("専門学校")
  ) {
    return "other";
  }
  if (
    normalized.includes("大学") ||
    /大$/.test(normalized) ||
    /大.+(?:学部|キャンパス)$/.test(normalized)
  ) {
    return "university";
  }
  return null;
}

async function readMasterDocument<T>(
  masterDir: string,
  fileName: string,
): Promise<T[]> {
  const parsed = JSON.parse(
    await readFile(path.join(masterDir, fileName), "utf8"),
  ) as MasterDocument<T>;
  if (!parsed || !Array.isArray(parsed.data)) {
    throw new Error(`Invalid master document: ${fileName}`);
  }
  return parsed.data;
}

export async function loadMasterData(masterDir: string): Promise<MasterData> {
  const [leagues, teams, teamNames, schools] = await Promise.all([
    readMasterDocument<LeagueMaster>(masterDir, "leagues.json"),
    readMasterDocument<TeamMaster>(masterDir, "teams.json"),
    readMasterDocument<TeamNameMaster>(masterDir, "team-names.json"),
    readMasterDocument<SchoolMaster>(masterDir, "schools.json"),
  ]);
  return { leagues, teams, teamNames, schools };
}

export function resolveTeamSeason(
  teamName: string | null,
  season: number | null,
  masterData: MasterData,
): TeamNameMaster["attributes"] | null {
  if (!teamName || season === null) {
    return null;
  }
  const normalizedName = normalizeMasterName(teamName);
  return (
    masterData.teamNames.find((entry) => {
      const attributes = entry.attributes;
      return (
        normalizeMasterName(attributes.name) === normalizedName &&
        season >= attributes.startSeason &&
        (attributes.endSeason === null || season <= attributes.endSeason)
      );
    })?.attributes ?? null
  );
}

export function resolveSchool(
  name: string,
  masterData: MasterData,
): SchoolMaster | null {
  const normalizedName = normalizeMasterName(name);
  const kind = classifySchoolKind(name);
  return (
    masterData.schools.find((entry) => {
      const attributes = entry.attributes;
      return (
        attributes.normalizedName === normalizedName &&
        (kind === null || attributes.kind === kind)
      );
    }) ?? null
  );
}
