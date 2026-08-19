import { describe, expect, it } from "vitest";
import {
  parseKanaIndexUrls,
  parsePlayerPage,
  parsePlayerUrlsFromKanaPage,
} from "./parse.js";

describe("NPB HTML parsing", () => {
  it("resolves kana and player links", () => {
    expect(
      parseKanaIndexUrls(
        '<a href="index_a.html">A</a>',
        "https://npb.jp/bis/players/active/index.html",
      ),
    ).toEqual(["https://npb.jp/bis/players/active/index_a.html"]);
    expect(
      parsePlayerUrlsFromKanaPage(
        '<a href="../123.html">player</a>',
        "https://npb.jp/bis/players/active/index_a.html",
      ),
    ).toEqual(["https://npb.jp/bis/players/123.html"]);
  });

  it("maps table headers to raw rows", () => {
    const result = parsePlayerPage(`
      <ul><li id="pc_v_name">山田 太郎</li><li id="pc_v_kana">ヤマダ タロウ</li></ul>
      <table><tr><th>所属球団</th><td>テスト</td></tr></table>
      <table id="tablefix_b"><thead><tr><th>年度</th><th>安打</th></tr></thead><tbody><tr><td>2024</td><td>100</td></tr></tbody></table>
    `);

    expect(result.playerName).toBe("山田 太郎");
    expect(result.battingStats).toEqual([{ 年度: "2024", 安打: "100" }]);
  });
});
