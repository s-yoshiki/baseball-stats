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

公開SQLiteはraw SQLiteとマスタから再生成するアプリケーション用データです。`players` に構造化プロフィール、`batting_stats` と `pitching_stats` にシーズン単位の全カウント値および派生値を保存します。`computed_json` のような重複JSONは保存せず、必要なJSON APIはraw SQLiteからexportします。raw SQLiteに複数のスクレイプrunがある場合は、完了済みrunのうち選手ごとに最も新しい行を統合します。これにより、日次runが現役選手と新規選手だけを含む差分runでも、過去の引退選手を失わずに公開DBを再生成できます。詳細なテーブル・計算式は [database-schema.md](database-schema.md) を参照してください。

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

GitHub Actionsの`Daily scrape`は前回成功runのraw SQLite artifactを復元します。`daily` scopeでは現役選手を毎回取得し、全選手インデックスとの差分から新規追加選手を取得します。artifactがない初回は全選手を取得します。

## Publishing `data.sqlite`

`Daily scrape` と `Publish SQLite` はどちらも、検証済みの公開用SQLiteをActions artifact（`baseball-stats-sqlite`、retention 14日）に加えて、このリポジトリのGitHub Pagesサイトへも公開します。公開するのは `data.sqlite`、チェックサム用の `data.sqlite.sha256`、行数と生成元コミットを持つ `metadata.json`、データセットの説明ページ `index.html` の4ファイルです。ビルドジョブが `site/` ディレクトリへこの4ファイルを組み立てて`actions/upload-pages-artifact@v3`でアップロードし、専用の`deploy-pages`ジョブが`actions/deploy-pages@v4`でデプロイします。デプロイのたびに公開ツリー全体が置き換わるため、GitHub Releaseのような履歴は残りません。

Actions artifactのダウンロードは公開リポジトリでもtokenが必須ですが、GitHub PagesはpublicリポジトリであればHTTP GETだけで匿名取得できます。`npb-analysis`はこの性質を利用して、tokenを持たずに最新の公開用SQLiteを取得します（前提としてこのリポジトリがpublicであることが必要です）。Pagesの有効化自体は`github-terraform`リポジトリのTerraformで管理しており（`build_type = "workflow"`）、このリポジトリのワークフローは`actions/configure-pages`の`enablement`機能を使わず、有効化済みであることを前提にします。デプロイジョブの権限は`pages: write` / `id-token: write`のみに絞り、ビルドジョブの`permissions.contents`は`read`のままにします。行数の算出には`scripts/parser/src/publish-counts.ts`の`readPublishedCounts`を使い、`validate-sqlite`と`build-release-metadata`の両方から同じ実装を再利用します。設計判断の詳細は[ADR 0005](adr/0005-github-pages-for-public-sqlite-distribution.md)を参照してください。
