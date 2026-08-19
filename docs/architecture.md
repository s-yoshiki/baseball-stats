# Architecture

## Data ownership

`packages/baseball-data` にNPBの行データの型、値の変換、派生スタッツ計算を集約します。HTMLの構造に依存する処理は `scripts/parser` だけに閉じ込めます。これにより、後から別ソースやWebアプリを追加しても、計算ロジックとJSON形式を共有できます。

## Player JSON API export

選手JSONは正本や管理対象ではなく、`export-json` で必要時に生成するJSON APIリソースです。JSON:APIに近い `data` エンベロープを採用します。NPBの未加工データはJSONに含めず、`data/raw/raw.sqlite` に保存します。

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

exportされた `index.json` は同じ `data` 形式で選手リソースの一覧を返します。ファイル名と `data.id` は一致させます。NPBページに括弧付きの本名がある場合は、括弧内を姓・名として分割し、括弧の外を登録名として保持します。括弧付きでない場合は表示名を登録名と姓・名の抽出元にします。`details` は投打、身長・体重、生年月日、経歴、ドラフトをAPI利用向けに構造化した値です。`totals` は数値化した基本集計値、`metrics` は派生スタッツです。

## SQLite

公開SQLiteはraw SQLiteとマスタから再生成するアプリケーション用データです。`players` にプロフィールと `computed_json`、`batting_stats` と `pitching_stats` にシーズン単位の基本値および主要な派生値を保存します。

スクレイピング用の `raw.sqlite` は別DBで、実行単位の `scrape_runs` と選手単位の `raw_players` を持ちます。raw DBのテーブル列とJSONキーは英語に統一します。`raw_players` は次の列を持ち、`profile_json`、`batting_stats_json`、`pitching_stats_json` はJSON文字列です。

```text
scrape_runs(id, source, started_at, completed_at, player_count)
raw_players(
  run_id, player_id, player_url, player_name, kana_name, is_active,
  profile_json, batting_stats_json, pitching_stats_json
)
```

`batting_stats_json` と `pitching_stats_json` の行キーは、それぞれ `season`、`team`、`games`、`hits`、`innings`、`earnedRuns` などの英語名です。プロフィールの取得値は `position`、`batsThrows`、`heightWeight`、`birthDate`、`career`、`draft` として保持し、未知の項目は `additional` 配列に退避します。

KyselyがTypeScriptのテーブル型・クエリ・スキーマビルダーを提供し、`atlas.hcl` のexternal schema loaderがKyselyから生成したDDLをAtlasへ渡します。Atlasの差分と適用用SQLは `atlas/migrations/raw` と `atlas/migrations/published` で管理します。
