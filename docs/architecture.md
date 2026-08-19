# Architecture

## Data ownership

`packages/baseball-data` にNPBの行データの型、値の変換、派生スタッツ計算を集約します。HTMLの構造に依存する処理は `scripts/parser` だけに閉じ込めます。これにより、後から別ソースやWebアプリを追加しても、計算ロジックとJSON形式を共有できます。

## Player JSON API format

`data/players/<player-id>.json` は1選手を表すJSON APIリソースです。JSON:APIに近い `data` エンベロープを採用し、アプリケーションが利用する整形済みデータだけを保存します。NPBの未加工データはJSONに含めず、`data/raw/raw.sqlite` に保存します。

```json
{
  "data": {
    "type": "player",
    "id": "01005153",
    "attributes": {
      "profile": {
        "familyName": "鈴木",
        "givenName": "一朗",
        "familyNameKana": "すずき",
        "givenNameKana": "いちろう",
        "registeredName": "イチロー",
        "registeredNameKana": "いちろー",
        "isActive": false,
        "details": {
          "position": "外野手",
          "throws": "右",
          "bats": "左",
          "heightCm": 180,
          "weightKg": 80,
          "birthDate": { "iso": "1973-10-22", "year": 1973, "month": 10, "day": 22 },
          "career": { "raw": "愛工大名電高", "entries": ["愛工大名電高"] },
          "draft": { "raw": "1991年ドラフト4位", "year": 1991, "rank": 4, "selection": "regular" }
        }
      },
      "battingStats": [{
        "season": 2025,
        "team": "球団名",
        "totals": { "hits": 100 },
        "metrics": { "battingAverage": 0.3, "ops": 0.8 }
      }],
      "pitchingStats": [],
      "career": { "batting": {}, "pitching": {} }
    },
    "links": { "self": "/players/01005153.json" }
  }
}
```

`data/players/index.json` は同じ `data` 形式で選手リソースの一覧を返します。ファイル名と `data.id` は一致させます。NPBページに括弧付きの本名がある場合は、括弧内を姓・名として分割し、括弧の外を登録名として保持します。括弧付きでない場合は表示名を登録名と姓・名の抽出元にします。`details` は投打、身長・体重、生年月日、経歴、ドラフトをAPI利用向けに構造化した値です。`totals` は数値化した基本集計値、`metrics` は派生スタッツです。

## SQLite

SQLiteはJSONの再生成物です。`players` にプロフィールと `computed_json`、`batting_stats` と `pitching_stats` にシーズン単位の基本値および主要な派生値を保存します。スクレイピング用の `raw.sqlite` は別DBで、実行単位の `scrape_runs` と選手単位の `raw_players` を持ちます。将来、複数ソースや履歴管理が必要になった時点で、スキーママイグレーションを導入します。
