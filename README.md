# baseball-stats

NPB公式サイトの選手プロフィール・打撃成績・投手成績をSQLiteで保存し、派生スタッツを計算して公開用SQLiteへ書き出すためのデータ基盤です。必要な場合だけ選手JSON APIを生成できます。`npb-analysis` と同じく pnpm + Turborepo のモノレポ構成ですが、Webアプリから独立したデータリポジトリとして設計しています。

## Data pipeline

```text
NPB HTML
  ↓ scrape + normalize + calculate
data/raw/raw.sqlite
  ↓ build with Kysely
data/sqlite/data.sqlite
  ↓ optional export           ↓ publish
data/export/players/*.json    GitHub Pages (data.sqlite)
```

GitHub Actionsでは、`Daily scrape` が毎日03:00 JSTに前回のraw SQLite artifactを復元し、現役選手と新たにNPBの全選手一覧へ追加された選手だけを取得します。初回や前回artifactがない場合は全選手を取得して基準データを作ります。生成したraw SQLiteと公開用SQLiteをartifactとして公開したうえで、公開用SQLiteをGitHub Pagesサイトへも公開します。`npb-analysis` はこのPagesサイトを自身の`push`/`schedule`/`workflow_dispatch`で取得しに来るため、`baseball-stats`側から`repository_dispatch`で更新通知を送ることはしません。

### 公開用SQLiteの配布（GitHub Pages）

`Daily scrape` と `Publish SQLite` はいずれも、検証済みの `data/sqlite/data.sqlite` を毎回このリポジトリのGitHub Pagesサイトへ次の4ファイルとしてデプロイします。

- `data.sqlite`: 公開用SQLite本体
- `data.sqlite.sha256`: `sha256sum` 形式のチェックサム（`<hash>  data.sqlite`）
- `metadata.json`: `source_sha` / `source_run_id` / `generated_at` / `scope` / `players` / `batting_rows` / `pitching_rows` を持つJSON
- `index.html`: データセットの説明と3ファイルへのリンク、最新の生成日時・行数を記載した最小限のページ

Actions artifactのZIPダウンロードは公開リポジトリでもtokenが必須ですが、GitHub PagesはpublicリポジトリであればHTTP GETだけで匿名取得できます。**このリポジトリが public であることが匿名ダウンロードの前提です。** Pagesの有効化そのものは `github-terraform` リポジトリのTerraformで管理しており（`build_type = "workflow"`）、このリポジトリのワークフローはPagesが有効化済みであることを前提にしています。匿名ダウンロードURLは次の形式です。

```text
https://s-yoshiki.github.io/baseball-stats/data.sqlite
https://s-yoshiki.github.io/baseball-stats/data.sqlite.sha256
https://s-yoshiki.github.io/baseball-stats/metadata.json
https://s-yoshiki.github.io/baseball-stats/index.html
```

既存のArtifact（`baseball-stats-sqlite` / `baseball-stats-raw`）はデバッグ・差分復元用に引き続き公開します。判断の背景は [ADR 0005](docs/adr/0005-github-pages-for-public-sqlite-distribution.md) を参照してください。`npb-analysis`側でのデプロイ手順は [npb-analysisの同期運用ドキュメント](https://github.com/s-yoshiki/npb-analysis/blob/develop/docs/operations/baseball-stats-sync.md) を参照してください。

### 初回フル取得（引退選手を含む全選手）

`npb-analysis` は引退選手を含む約7900選手分のデータを前提としており、デプロイ時に公開DBの選手数が一定数（デフォルト5000）を下回ると弾く下限チェックを持ちます。現役選手のみ（`scope=active`）で生成した公開DBは、実測で `players=1072` とこの下限に届きません。

初回公開時、またはraw SQLiteのbaseline作り直しが必要なときは、`Daily scrape` を `workflow_dispatch` で `scope=all` を指定して手動実行し、引退選手を含む全選手をフル取得してください（`Daily scrape` は `timeout-minutes: 90`）。`delay`はnpb.jpへの負荷を考慮してデフォルト（300ms）以上を維持してください。`Publish SQLite` は現役ロースターの再公開専用（`scope=active`のみ選択可、`timeout-minutes: 20`）で、フル取得には使えません。

選手データの正本は `data/raw/raw.sqlite` とし、公開用の整形済みデータは `data/sqlite/data.sqlite` に生成します。選手JSONはGit管理せず、必要な場合だけ `export-json` で生成します。プロフィールには `familyName`、`givenName`、`familyNameKana`、`givenNameKana`、`registeredName`、`registeredNameKana` を持たせ、`details` には投打、身長・体重、生年月日、経歴、ドラフトを構造化します。

NPBの取得値は `data/raw/raw.sqlite` に実行単位で保存します。raw SQLiteのテーブル列とJSONキーは英語で統一し、NPBの値（成績の文字列やプロフィールの表記）は保持します。成績行は `season`、`team`、`games`、`hits` など、プロフィールは `position`、`batsThrows`、`heightWeight` などに正規化します。未知のプロフィール項目は `additional[{ sourceKey, value }]` に保持します。`data/masters` にはリーグ、球団、球団名・年度、学校のJSON APIマスタを置きます。SQLiteの型・クエリはKysely、スキーマ差分とマイグレーションはAtlasで管理します。

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

`scrape` は選手を1件取得するたびにスクレイピングデータを `data/raw/raw.sqlite` へ保存し、取得完了後に `data/sqlite/data.sqlite` も再生成します。選手データ全件をメモリに保持しません。保存先は `--raw-db` と `--db` で変更できます。

日次差分を実行する場合は、前回のraw SQLiteを `--raw-db` に用意してから `daily` scopeを指定します。`daily` は現役選手を毎回取得し、全選手インデックスに存在するがraw SQLiteに未登録の選手だけを追加取得します。

```sh
pnpm --filter @repo/parser run write-sqlite

pnpm --filter @repo/parser run export-json -- \
  --raw-db ../../data/raw/raw.sqlite \
  --output-dir ../../data/export/players
```

パスを指定する場合:

```sh
pnpm --filter @repo/parser run write-sqlite -- \
  --raw-db ../../data/raw/raw.sqlite \
  --db ../../data/sqlite/data.sqlite
```

`export-json` はraw.sqliteの完了済みrunを選手ごとに統合した最新状態から、必要なときだけ選手JSON APIリソースを生成します。`write-sqlite` はraw.sqliteから公開用SQLiteを再構築します。

SQLiteを手動で検証する場合:

```sh
pnpm --filter @repo/parser exec tsx src/validate-sqlite.ts \
  --db ../../data/sqlite/data.sqlite
```

`write-sqlite` は `data/masters` も読み込み、`leagues`、`teams`、`team_seasons`、`schools`、`player_schools` を作成します。成績行には表示用の球団名に加え、年度と球団マスタから解決した `team_id` / `league_id` を保存します。別のマスタディレクトリを使う場合は `--masters-dir` を指定してください。

## Repository layout

- `packages/baseball-data`: 型、JSON export、派生スタッツ計算
- `scripts/parser`: NPBスクレイパー、raw SQLite reader/writer、Kysely + `better-sqlite3` writer
- `atlas.hcl` / `atlas/migrations`: Kysely外部スキーマとAtlasマイグレーション
- `data/export/players`: 必要時に生成する選手JSON APIリソース（Git管理外）
- `data/masters`: リーグ、球団、球団名・年度、学校のマスタ
- `data/raw`: スクレイピングデータSQLite（Git管理外）
- `data/sqlite`: SQLite出力（Git管理外）
- `docs/adr`: データ形式とSQLite出力の設計判断

## Schema management

Kyselyの型定義・スキーマビルダーを外部スキーマローダーとしてAtlasから読み込みます。公開DBとraw DBは別々のAtlas migration directoryを持ちます。

```sh
atlas migrate diff --env published
atlas migrate diff --env raw
atlas migrate validate --env published
atlas migrate validate --env raw
```

## Verification

```sh
pnpm verify
```
