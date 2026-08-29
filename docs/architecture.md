# Architecture

## Data ownership

`packages/baseball-data` にはraw SQLiteの生成に必要な型と、NPBの日本語見出し（`年度`、`安打`など）を英語キー（`season`、`hits`など）へ正規化する純粋関数だけを置きます。HTMLの構造に依存する処理は `scripts/parser` だけに閉じ込めます。

このリポジトリはraw SQLiteの生成とGitHub Pagesでの公開までを担当します。派生指標の計算、マスタによる球団・学校の名寄せ、アプリ向けスキーマの構築、選手JSON APIのexportは行いません。これらの加工は `npb-analysis` 側の責務です。役割分担の経緯は [ADR 0007](adr/0007-raw-only-scope-and-pages-publish-raw-sqlite.md) を参照してください。

## raw SQLite

スクレイピング結果は `data/raw/raw.sqlite` に保存します。実行単位の `scrape_runs` と選手単位の `raw_players` を持ちます。raw DBのテーブル列とJSONキーは英語に統一します。`raw_players` は次の列を持ち、`profile_json`、`batting_stats_json`、`pitching_stats_json` はJSON文字列です。

```text
scrape_runs(id, source, started_at, completed_at, player_count)
raw_players(
  run_id, player_id, player_url, player_name, kana_name, is_active,
  updated_at, profile_json, batting_stats_json, pitching_stats_json
)
```

`batting_stats_json` と `pitching_stats_json` の行キーは、それぞれ `season`、`team`、`games`、`hits`、`innings`、`earnedRuns` などの英語名です。プロフィールの取得値は `position`、`batsThrows`、`heightWeight`、`birthDate`、`career`、`draft` として保持し、未知の項目は `additional` 配列に退避します。

KyselyがTypeScriptのテーブル型・クエリ・スキーマビルダーを提供し、`atlas.hcl` のexternal schema loaderがKyselyから生成したDDLをAtlasへ渡します。Atlasの差分と適用用SQLは `atlas/migrations/raw` で管理します。

GitHub Actionsの`Daily scrape`は、GitHub Pagesへ自分が最後に公開したraw SQLiteを基準に復元します（初回publishが終わるまでの移行期間だけ、Pages取得に失敗した場合は前回成功runのraw SQLite artifactへフォールバックします）。`daily` scopeでは現役選手を毎回取得し、全選手インデックスとの差分から新規追加選手を取得します。基準が無い初回は全選手を取得します。

## Publishing `raw.sqlite`

`Daily scrape` は、検証済みのraw SQLiteをActions artifact（`baseball-stats-raw`、retention 30日、バックアップ用途）に加えて、このリポジトリのGitHub Pagesサイトへも公開します。公開するのは `raw.sqlite`、チェックサム用の `raw.sqlite.sha256`、選手数と生成元コミットを持つ `metadata.json`、データセットの説明ページ `index.html` の4ファイルです。ビルドジョブが `site/` ディレクトリへこの4ファイルを組み立てて`actions/upload-pages-artifact@v3`でアップロードし、専用の`deploy-pages`ジョブが`actions/deploy-pages@v4`でデプロイします。デプロイのたびに公開ツリー全体が置き換わるため、GitHub Releaseのような履歴は残りません。

Actions artifactのダウンロードは公開リポジトリでもtokenが必須ですが、GitHub PagesはpublicリポジトリであればHTTP GETだけで匿名取得できます。`npb-analysis`はこの性質を利用して、tokenを持たずに最新のraw SQLiteを取得します（前提としてこのリポジトリがpublicであることが必要です）。Pagesの有効化自体は`github-terraform`リポジトリのTerraformで管理しており（`build_type = "workflow"`）、このリポジトリのワークフローは`actions/configure-pages`の`enablement`機能を使わず、有効化済みであることを前提にします。デプロイジョブの権限は`pages: write` / `id-token: write`のみに絞り、ビルドジョブの`permissions.contents`は`read`のままにします。選手数・run数の算出には`scripts/parser/src/publish-counts.ts`の`readRawCounts`を使い、`validate-sqlite`と`build-release-metadata`の両方から同じ実装を再利用します。設計判断の詳細は[ADR 0006](adr/0006-github-pages-for-public-sqlite-distribution.md)と[ADR 0007](adr/0007-raw-only-scope-and-pages-publish-raw-sqlite.md)を参照してください。

日次差分の基準をGitHub Pages由来に切り替えたのは、Actions artifactのretention（30日）に基準runの寿命が縛られる制約を解消するためです。Pages上の`raw.sqlite`は直近の公開ワークフローが常に上書きしているため、寿命を持ちません。
