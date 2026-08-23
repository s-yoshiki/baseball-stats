# baseball-stats

NPB公式サイト（npb.jp）の選手プロフィール・打撃成績・投手成績をスクレイピングし、raw SQLite（`data/raw/raw.sqlite`）として保存・公開するための取得レイヤーです。`npb-analysis` と同じく pnpm + Turborepo のモノレポ構成ですが、Webアプリから独立したデータ取得専用のリポジトリとして設計しています。

このリポジトリは **raw SQLiteの生成とGitHub Pagesでの公開だけ** を担当します。派生指標の計算、マスタによる球団・学校の名寄せ、アプリ向けスキーマの構築、選手JSON APIのexportといった加工工程は `npb-analysis` 側に実装されており、`npb-analysis` がデプロイ時にこのリポジトリの公開物を取得して加工します。役割分担の背景は [ADR 0007](docs/adr/0007-raw-only-scope-and-pages-publish-raw-sqlite.md) を参照してください。

## Data pipeline

```text
NPB HTML
  ↓ scrape + normalize
data/raw/raw.sqlite
  ↓ publish
GitHub Pages (raw.sqlite)
  ↓ fetch at deploy time
npb-analysis
```

`Daily scrape` は毎日03:00 JST（`cron: "0 18 * * *"`）に自動実行されます。`npb-analysis`への統合作業中は一時的にscheduleを止め`workflow_dispatch`のみ受け付けていましたが、GitHub Pagesへのraw.sqlite初回publishが成功し、`npb-analysis`のDeployがこのPagesサイトを参照する経路に切り替わったことで自動実行を復活させています。`workflow_dispatch`による手動実行も引き続き可能です。実行時は自分が最後にGitHub Pagesへ公開したraw SQLiteを基準にして現役選手と新たにNPBの全選手一覧へ追加された選手だけを取得します（基準が無い場合は全選手を取得して基準データを作ります）。生成したraw SQLiteはActions artifactとして公開したうえで、このリポジトリのGitHub Pagesサイトへも公開します。

`npb-analysis`のDeployは`cron: "0 20 * * *"`（05:00 JST）でこのPagesサイトのraw.sqliteを取得します。`Daily scrape`は03:00 JST開始・`timeout-minutes: 90`のため遅くとも04:30 JSTにはscrapeジョブが完了し、続くdeploy-pagesジョブによるPagesへのpublishも05:00 JSTより前に終わります。この時間関係は`.github/workflows/daily-scrape.yml`にもコメントで明記しています。開始時刻（cron）やtimeout-minutesを変更してこの関係を崩す場合は、`npb-analysis`側のDeploy cronも合わせて見直してください。

### raw SQLiteの配布（GitHub Pages）

`Daily scrape` は、検証済みの `data/raw/raw.sqlite` を毎回このリポジトリのGitHub Pagesサイトへ次の4ファイルとしてデプロイします。

- `raw.sqlite`: raw SQLite本体（スクレイピング結果と取得履歴）
- `raw.sqlite.sha256`: `sha256sum` 形式のチェックサム（`<hash>  raw.sqlite`）
- `metadata.json`: `source_sha` / `source_run_id` / `generated_at` / `scope` / `players`（`COUNT(DISTINCT player_id)`）/ `runs`（`scrape_runs` 件数）を持つJSON
- `index.html`: データセットの説明と3ファイルへのリンク、最新の生成日時・規模を記載した最小限のページ

Actions artifactのZIPダウンロードは公開リポジトリでもtokenが必須ですが、GitHub PagesはpublicリポジトリであればHTTP GETだけで匿名取得できます。**このリポジトリが public であることが匿名ダウンロードの前提です。** Pagesの有効化そのものは `github-terraform` リポジトリのTerraformで管理しており（`build_type = "workflow"`）、このリポジトリのワークフローはPagesが有効化済みであることを前提にしています。匿名ダウンロードURLは次の形式です。

```text
https://s-yoshiki.github.io/baseball-stats/raw.sqlite
https://s-yoshiki.github.io/baseball-stats/raw.sqlite.sha256
https://s-yoshiki.github.io/baseball-stats/metadata.json
https://s-yoshiki.github.io/baseball-stats/index.html
```

日次差分run（`daily` scope）は、このPagesサイトへ自分が最後に公開した `raw.sqlite` を基準に前回状態を復元します。以前はActions artifact（`baseball-stats-raw`、retention 30日）から `gh run download` で復元していましたが、retentionが切れると基準を失う制約がありました。Pages由来の取得に切り替えたことでこの制約が無くなりました——Pagesの`raw.sqlite`は直近のpublishで常に上書きされているため、retentionのような期限を持ちません。初回publishが終わるまでの移行期間はActions artifact復元へのフォールバック経路がありましたが、初回publishの成功後に削除済みです。既存のArtifact（`baseball-stats-raw`）はPagesが壊れた場合のバックアップ・デバッグ用途として引き続き公開します（`Restore previous raw SQLite`ステップからは参照しません）。詳細な設計判断は [ADR 0006](docs/adr/0006-github-pages-for-public-sqlite-distribution.md) と [ADR 0007](docs/adr/0007-raw-only-scope-and-pages-publish-raw-sqlite.md) を参照してください。`npb-analysis` 側での取得・デプロイ手順は [npb-analysisの同期運用ドキュメント](https://github.com/s-yoshiki/npb-analysis/blob/develop/docs/operations/baseball-stats-sync.md) を参照してください。

### 初回フル取得（引退選手を含む全選手）

初回公開時、またはraw SQLiteのbaseline作り直しが必要なときは、`Daily scrape` を `workflow_dispatch` で `scope=all` を指定して手動実行し、引退選手を含む全選手をフル取得してください（`timeout-minutes: 90`）。`delay`はnpb.jpへの負荷を考慮してデフォルト（300ms）以上を維持してください。

選手データの正本は `data/raw/raw.sqlite` です。NPBの取得値は実行単位（`scrape_runs`）で保存し、raw SQLiteのテーブル列とJSONキーは英語で統一しつつ、NPBの値（成績の文字列やプロフィールの表記）はそのまま保持します。成績行は `season`、`team`、`games`、`hits` など、プロフィールは `position`、`batsThrows`、`heightWeight` などに正規化します。未知のプロフィール項目は `additional[{ sourceKey, value }]` に保持します。SQLiteの型・クエリはKysely、スキーマ差分とマイグレーションはAtlasで管理します。

## Setup

要件は Node.js 26 と pnpm 11 です。
Atlasのスキーマ差分・マイグレーション操作にはAtlas CLIも必要です。

```sh
pnpm install
# macOS / Homebrew
brew install ariga/tap/atlas
```

## Usage

少量の取得でパーサーを確認します。NPBサイトへのアクセスには間隔を置いてください。

```sh
pnpm --filter @repo/parser run scrape -- \
  --scope active \
  --limit 3 \
  --kana-limit 1 \
  --delay 300 \
  --debug
```

`scrape` は選手を1件取得するたびにスクレイピングデータを `data/raw/raw.sqlite` へ保存します。選手データ全件をメモリに保持しません。保存先は `--raw-db` で変更できます。

日次差分を実行する場合は、前回のraw SQLiteを `--raw-db` に用意してから `daily` scopeを指定します。`daily` は現役選手を毎回取得し、全選手インデックスに存在するがraw SQLiteに未登録の選手だけを追加取得します。

```sh
pnpm --filter @repo/parser run scrape -- \
  --scope daily \
  --raw-db ../../data/raw/raw.sqlite \
  --delay 300 \
  --debug
```

raw SQLiteを手動で検証する場合:

```sh
pnpm --filter @repo/parser run validate-sqlite -- \
  --db ../../data/raw/raw.sqlite
```

`validate-sqlite` は `scrape_runs` の件数と `raw_players` の `COUNT(DISTINCT player_id)` を検証・出力します。

## Repository layout

- `packages/baseball-data`: raw生成に必要な型とNPB表記→英語キーの正規化関数
- `scripts/parser`: NPBスクレイパー、raw SQLite reader/writer（Kysely + `better-sqlite3`）
- `atlas.hcl` / `atlas/migrations/raw`: raw SQLiteのKysely外部スキーマとAtlasマイグレーション
- `data/raw`: スクレイピングデータSQLite（Git管理外）
- `docs/adr`: データ形式とraw SQLite公開の設計判断

## Schema management

Kyselyのスキーマビルダーを外部スキーマローダーとしてAtlasから読み込みます。raw SQLiteのマイグレーションディレクトリは `atlas/migrations/raw` です。

```sh
atlas migrate diff --env raw
atlas migrate validate --env raw
```

## Verification

```sh
pnpm verify
```
