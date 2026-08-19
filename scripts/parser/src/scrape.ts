import type { RawPlayer } from "@repo/baseball-data";
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
  includeRetired: boolean;
  delayMs: number;
  kanaLimit?: number;
  limit?: number;
  debug: boolean;
};

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
): Promise<RawPlayer[]> {
  const activeUrls = await collectPlayerUrls(ACTIVE_INDEX_ROOT_URL, options);
  const urls = options.includeRetired
    ? await collectPlayerUrls(ALL_INDEX_ROOT_URL, options)
    : activeUrls;
  const sortedUrls = [...urls].sort();
  const urlsToScrape =
    options.limit === undefined
      ? sortedUrls
      : sortedUrls.slice(0, options.limit);

  const players: RawPlayer[] = [];
  for (const [index, url] of urlsToScrape.entries()) {
    const parsed = parsePlayerPage(await fetchHtml(url));
    const player: RawPlayer = {
      id: toBase36PlayerIdFromUrl(url),
      playerUrl: url,
      playerName: parsed.playerName,
      kanaName: parsed.kanaName,
      isActive: activeUrls.has(url),
      detailInfo: parsed.detailInfo,
      battingStats: parsed.battingStats,
      pitchingStats: parsed.pitchingStats,
    };
    players.push(player);
    if (options.debug) {
      console.log(
        `[debug] ${index + 1}/${urlsToScrape.length} ${player.id} ${player.playerName || "(empty)"} batting=${player.battingStats.length} pitching=${player.pitchingStats.length}`,
      );
    }
    await sleep(options.delayMs);
  }
  return players;
}
