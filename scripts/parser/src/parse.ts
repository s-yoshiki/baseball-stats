import * as cheerio from "cheerio";
import { BASE_URL } from "./constants.js";

function resolveUrl(href: string, basePath: string): string {
  return new URL(href, `${BASE_URL}${basePath}`).toString();
}

export function parseKanaIndexUrls(
  html: string,
  indexRootUrl: string,
): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  const indexPath = new URL(indexRootUrl).pathname.replace(/index\.html$/, "");

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href")?.trim();
    if (!href) {
      return;
    }
    if (
      /^(?:index_[a-z]+\.html|\/bis\/players\/(?:active|all)\/index_[a-z]+\.html)$/.test(
        href,
      )
    ) {
      urls.add(resolveUrl(href, indexPath));
    }
  });

  return [...urls].sort();
}

export function parsePlayerUrlsFromKanaPage(
  html: string,
  kanaPageUrl: string,
): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href")?.trim();
    if (!href) {
      return;
    }
    if (
      /^(?:\.\.\/\d+\.html|\/bis\/players\/\d+\.html|https?:\/\/npb\.jp\/bis\/players\/\d+\.html)$/.test(
        href,
      )
    ) {
      urls.add(resolveUrl(href, new URL(kanaPageUrl).pathname));
    }
  });

  return [...urls].sort();
}

function normalizeCellText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseStatTable(
  $: cheerio.CheerioAPI,
  selector: string,
): Record<string, string>[] {
  const table = $(selector);
  const headers = table
    .children("thead")
    .find("th")
    .map((_, th) => normalizeCellText($(th).text()))
    .get();

  if (!headers.length) {
    return [];
  }

  const rows: Record<string, string>[] = [];
  table
    .children("tbody")
    .children("tr")
    .each((_, tr) => {
      const cells = $(tr)
        .children("td, th")
        .map((_, cell) => normalizeCellText($(cell).text()))
        .get();
      if (!cells.length) {
        return;
      }

      const row: Record<string, string> = {};
      for (
        let index = 0;
        index < Math.min(headers.length, cells.length);
        index++
      ) {
        const header = headers[index];
        const cell = cells[index];
        if (header !== undefined && cell !== undefined) {
          row[header] = header === "投球回" ? cell.replace(/\s+/g, "") : cell;
        }
      }
      rows.push(row);
    });

  return rows;
}

export function parsePlayerPage(html: string): {
  playerName: string;
  kanaName: string;
  detailInfo: Record<string, string>;
  battingStats: Record<string, string>[];
  pitchingStats: Record<string, string>[];
} {
  const $ = cheerio.load(html);
  const detailInfo: Record<string, string> = {};

  $("table")
    .not("#tablefix_p")
    .not("#tablefix_b")
    .not(".table_inning")
    .first()
    .find("tr")
    .each((_, tr) => {
      const key = normalizeCellText($(tr).find("th").text());
      const value = normalizeCellText($(tr).find("td").text());
      if (key) {
        detailInfo[key] = value;
      }
    });

  return {
    playerName: normalizeCellText($("li#pc_v_name").first().text()),
    kanaName: normalizeCellText($("li#pc_v_kana").first().text()),
    detailInfo,
    battingStats: parseStatTable($, "#tablefix_b"),
    pitchingStats: parseStatTable($, "#tablefix_p"),
  };
}
