# baseball-stats

NPB公式サイトの選手プロフィール・打撃成績・投手成績をSQLiteで保存し、派生スタッツを計算して公開用SQLiteへ書き出すためのデータ基盤です。必要な場合だけ選手JSON APIを生成できます。`npb-analysis` と同じく pnpm + Turborepo のモノレポ構成ですが、Webアプリから独立したデータリポジトリとして設計しています。

## Data pipeline

```text
NPB HTML
  ↓ scrape + normalize + calculate
data/raw/raw.sqlite
  ↓ build with Kysely
data/sqlite/data.sqlite
  ↓ optional export
data/export/players/*.json
```

GitHub Actionsでは、`Daily scrape` が毎日03:00 JSTにraw SQLiteと公開用SQLiteを生成し、Actions artifactとして公開したうえで `npb-analysis` に更新通知を送ります。必要なGitHub secretsと、npb-analysis側でのPR・デプロイまでの手順は [npb-analysisの同期運用ドキュメント](https://github.com/s-yoshiki/npb-analysis/blob/develop/docs/operations/baseball-stats-sync.md) を参照してください。

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

`export-json` はraw.sqliteの最新スクレイプ実行から、必要なときだけ選手JSON APIリソースを生成します。`write-sqlite` はraw.sqliteから公開用SQLiteを再構築します。

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
