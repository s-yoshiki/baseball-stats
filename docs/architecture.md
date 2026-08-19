# Architecture

## Data ownership

`packages/baseball-data` にNPBの行データの型、値の変換、派生スタッツ計算を集約します。HTMLの構造に依存する処理は `scripts/parser` だけに閉じ込めます。これにより、後から別ソースやWebアプリを追加しても、計算ロジックとJSON形式を共有できます。

## Player JSON API format

`data/players/<player-id>.json` は1選手を表すJSON APIリソースです。JSON:APIに近い `data` エンベロープを採用し、取得元の行データと計算値を同じ統計要素へまとめます。

```json
{
  "schemaVersion": 2,
  "data": {
    "type": "player",
    "id": "01005153",
    "attributes": {
      "profile": { "name": "選手名", "kana": "せんしゅめい", "isActive": true },
      "battingStats": [{
        "season": 2025,
        "team": "球団名",
        "raw": { "年度": "2025", "安打": "100" },
        "totals": { "hits": 100 },
        "metrics": { "battingAverage": 0.3, "ops": 0.8 }
      }],
      "pitchingStats": [],
      "career": { "batting": {}, "pitching": {} }
    },
    "links": { "self": "/players/01005153.json" }
  },
  "meta": {
    "source": { "name": "npb.jp", "url": "https://npb.jp/bis/players/01005153.html" },
    "generatedAt": "2026-08-19T00:00:00.000Z"
  }
}
```

`data/players/index.json` は同じ `data` 形式で選手リソースの一覧を返します。ファイル名と `data.id` は一致させます。`raw` はNPBページの表記をなるべく保ち、`totals` はAPI利用向けに数値化した基本集計値、`metrics` は派生スタッツです。

## SQLite

SQLiteはJSONの再生成物です。`players` にプロフィールと `computed_json`、`batting_stats` と `pitching_stats` にシーズン単位のraw値および主要な派生値を保存します。将来、複数ソースや履歴管理が必要になった時点で、スキーママイグレーションを導入します。
