import type { ScrapedPlayer } from "@repo/baseball-data";
import { ACTIVE_INDEX_ROOT_URL, ALL_INDEX_ROOT_URL } from "./constants.js";
import { fetchHtml } from "./fetch.js";
import {
  parseKanaIndexUrls,
  parsePlayerPage,
  parsePlayerUrlsFromKanaPage,
} from "./parse.js";
import { toBase36PlayerIdFromUrl } from "./player-id.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ScrapeOptions = {
  scope: "active" | "all" | "daily";
  delayMs: number;
  kanaLimit?: number;
  limit?: number;
  debug: boolean;
  knownPlayerIds?: ReadonlySet<string>;
};

export type ScrapedPlayerHandler = (player: ScrapedPlayer) => Promise<void>;

async function collectPlayerUrls(
  indexRootUrl: string,
  options: ScrapeOptions,
): Promise<Set<string>> {
  const rootHtml = await fetchHtml(indexRootUrl);
  const allKanaPages = parseKanaIndexUrls(rootHtml, indexRootUrl);
  const kanaPages =
    options.kanaLimit === undefined
      ? allKanaPages
      : allKanaPages.slice(0, options.kanaLimit);

  if (!kanaPages.length) {
    throw new Error(`Kana index pages not found from ${indexRootUrl}`);
  }
  if (options.debug) {
    console.log(
      `[debug] ${indexRootUrl}: ${kanaPages.length}/${allKanaPages.length} kana pages`,
    );
  }

  const urls = new Set<string>();
  for (const pageUrl of kanaPages) {
    const pageHtml = await fetchHtml(pageUrl);
    for (const playerUrl of parsePlayerUrlsFromKanaPage(pageHtml, pageUrl)) {
      urls.add(playerUrl);
    }
    await sleep(options.delayMs);
  }
  return urls;
}

export async function scrapePlayers(
  options: ScrapeOptions,
  onPlayer: ScrapedPlayerHandler,
): Promise<{ players: number }> {
  const activeUrls = await collectPlayerUrls(ACTIVE_INDEX_ROOT_URL, options);
  let playerCount = 0;

  const scrapePlayer = async (url: string): Promise<void> => {
    const parsed = parsePlayerPage(await fetchHtml(url));
    const player: ScrapedPlayer = {
      id: toBase36PlayerIdFromUrl(url),
      playerUrl: url,
      playerName: parsed.playerName,
      kanaName: parsed.kanaName,
      isActive: activeUrls.has(url),
      detailInfo: parsed.detailInfo,
      battingStats: parsed.battingStats,
      pitchingStats: parsed.pitchingStats,
    };
    await onPlayer(player);
    playerCount += 1;
    if (options.debug) {
      console.log(
        `[debug] ${playerCount} ${player.id} ${player.playerName || "(empty)"} batting=${player.battingStats.length} pitching=${player.pitchingStats.length}`,
      );
    }
    await sleep(options.delayMs);
  };

  if (options.scope === "active") {
    for (const url of [...activeUrls].sort()) {
      if (options.limit !== undefined && playerCount >= options.limit) {
        break;
      }
      await scrapePlayer(url);
    }
    return { players: playerCount };
  }

  const seenUrls = new Set<string>();

  const rootHtml = await fetchHtml(ALL_INDEX_ROOT_URL);
  const allKanaPages = parseKanaIndexUrls(rootHtml, ALL_INDEX_ROOT_URL);
  const kanaPages =
    options.kanaLimit === undefined
      ? allKanaPages
      : allKanaPages.slice(0, options.kanaLimit);

  if (!kanaPages.length) {
    throw new Error(`Kana index pages not found from ${ALL_INDEX_ROOT_URL}`);
  }
  if (options.debug) {
    console.log(
      `[debug] ${ALL_INDEX_ROOT_URL}: ${kanaPages.length}/${allKanaPages.length} kana pages`,
    );
  }

  for (const pageUrl of kanaPages) {
    const pageHtml = await fetchHtml(pageUrl);
    const playerUrls = parsePlayerUrlsFromKanaPage(pageHtml, pageUrl);
    for (const url of playerUrls) {
      if (seenUrls.has(url)) {
        continue;
      }
      if (options.limit !== undefined && playerCount >= options.limit) {
        return { players: playerCount };
      }

      seenUrls.add(url);
      if (
        options.scope === "daily" &&
        !activeUrls.has(url) &&
        options.knownPlayerIds?.has(toBase36PlayerIdFromUrl(url))
      ) {
        continue;
      }
      await scrapePlayer(url);
    }
    await sleep(options.delayMs);
  }

  return { players: playerCount };
}
