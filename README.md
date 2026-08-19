# baseball-stats

NPB公式サイトの選手プロフィール・打撃成績・投手成績をJSONで保存し、派生スタッツを計算してSQLiteへ書き出すためのデータ基盤です。`npb-analysis` と同じく pnpm + Turborepo のモノレポ構成ですが、Webアプリから独立したデータリポジトリとして設計しています。

## Data pipeline

```text
NPB HTML
  ↓ scrape
data/raw/raw.sqlite
  ↓ normalize + calculate
data/players/<player-id>.json
  ↓ write-sqlite
data/sqlite/data.sqlite
```

GitHub Actionsでは、`Daily scrape` が毎日03:00 JSTに選手JSONの更新PRを作成します。mainへマージすると `Publish SQLite` がSQLiteを検証し、Actions artifactとして公開したうえで `npb-analysis` に更新通知を送ります。必要なGitHub secretsと、npb-analysis側でのPR・デプロイまでの手順は [npb-analysisの同期運用ドキュメント](https://github.com/s-yoshiki/npb-analysis/blob/develop/docs/operations/baseball-stats-sync.md) を参照してください。

`data/players/index.json` は選手一覧、`data/players/<player-id>.json` は1選手分のJSON APIリソースです。プロフィールには `familyName`、`givenName`、`familyNameKana`、`givenNameKana`、`registeredName`、`registeredNameKana` を持たせます。`details` には投打、身長・体重、生年月日、経歴、ドラフトを構造化して保存します。JSONはAPI向けの整形済みデータだけを持ち、出典情報やprovenanceは管理しません。

NPBの取得値は `data/raw/raw.sqlite` に実行単位で保存します。選手JSONの成績要素には `totals` と `metrics` に数値化した集計値・OPS、ISO、BB%、K%、ERA、WHIP、K/9、BB/9、K/BBを追加します。`data/masters` にはリーグ、球団、球団名・年度、学校のJSON APIマスタを置きます。アプリ向けSQLiteは選手JSONとマスタJSONから再生成可能な出力です。

## Setup

要件は Node.js 26 と pnpm 11 です。

```sh
pnpm install
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

`scrape` は取得した純粋なスクレイピングデータを `data/raw/raw.sqlite` に保存し、整形済みの選手JSONを `data/players` に生成します。保存先は `--raw-db` で変更できます。

Wikipediaや人手による修正は `data/overrides/players/<player-id>.json` に疎なJSONパッチとして保存します。`scrape` と `calculate` はこのディレクトリを自動的に適用します。

取得後、選手ごとのJSON APIリソースとSQLiteを生成します。

```sh
pnpm --filter @repo/parser run calculate
pnpm --filter @repo/parser run write-sqlite
```

パスを指定する場合:

```sh
pnpm --filter @repo/parser run calculate -- \
  --input-dir ../../data/players \
  --output-dir ../../data/players

pnpm --filter @repo/parser run write-sqlite -- \
  --input-dir ../../data/players \
  --db ../../data/sqlite/data.sqlite
```

`calculate` は個別リソースを再計算して同じディレクトリへ書き戻します。`--input <legacy-snapshot>` を指定すると、旧形式の集約JSONから個別リソースへ移行できます。`write-sqlite` は選手JSON全体からSQLiteを再構築します。

SQLiteを手動で検証する場合:

```sh
pnpm --filter @repo/parser exec tsx src/validate-sqlite.ts \
  --db ../../data/sqlite/data.sqlite
```

`write-sqlite` は `data/masters` も読み込み、`leagues`、`teams`、`team_seasons`、`schools`、`player_schools` を作成します。成績行には表示用の球団名に加え、年度と球団マスタから解決した `team_id` / `league_id` を保存します。別のマスタディレクトリを使う場合は `--masters-dir` を指定してください。

## Repository layout

- `packages/baseball-data`: 型、JSON I/O、派生スタッツ計算
- `scripts/parser`: NPBスクレイパー、派生JSON生成、Kysely + `better-sqlite3` writer
- `data/players/index.json`: 選手一覧のJSON APIリソース
- `data/players/<player-id>.json`: 1選手分のAPI向け整形済みデータ
- `data/overrides/players`: Wikipedia・手動編集の選手別override
- `data/masters`: リーグ、球団、球団名・年度、学校のマスタ
- `data/raw`: スクレイピングデータSQLite（Git管理外）
- `data/sqlite`: SQLite出力（Git管理外）
- `docs/adr`: データ形式とSQLite出力の設計判断

## Verification

```sh
pnpm verify
```
