# Architecture

## Data ownership

`packages/baseball-data` にNPBの行データの型、値の変換、派生スタッツ計算を集約します。HTMLの構造に依存する処理は `scripts/parser` だけに閉じ込めます。これにより、後から別ソースやWebアプリを追加しても、計算ロジックとJSON形式を共有できます。

## Snapshot format

スナップショットは次のメタデータを持ちます。

```json
{
  "schemaVersion": 1,
  "pipeline": "scrape",
  "generatedAt": "2026-08-19T00:00:00.000Z",
  "source": { "name": "npb.jp", "url": "https://npb.jp/bis/players/" },
  "players": []
}
```

raw snapshotの `players` はNPBページの表記をなるべく保ちます。計算値は `computedStats` に分離して追加し、rawの再現性を保ちます。

## SQLite

SQLiteはJSONの再生成物です。`players` にプロフィールと `computed_json`、`batting_stats` と `pitching_stats` にシーズン単位のraw値および主要な派生値を保存します。将来、複数ソースや履歴管理が必要になった時点で、スキーママイグレーションを導入します。
