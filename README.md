# baseball-stats

NPB公式サイトの選手プロフィール・打撃成績・投手成績をJSONで保存し、派生スタッツを計算してSQLiteへ書き出すためのデータ基盤です。`npb-analysis` と同じく pnpm + Turborepo のモノレポ構成ですが、Webアプリから独立したデータリポジトリとして設計しています。

## Data pipeline

```text
NPB HTML
  ↓ scrape
data/players/<player-id>.json
  ↓ write-sqlite
data/sqlite/baseball.sqlite
```

`data/players/index.json` は選手一覧、`data/players/<player-id>.json` は1選手分のJSON APIリソースです。プロフィールには `familyName`、`givenName`、`familyNameKana`、`givenNameKana`、`registeredName`、`registeredNameKana` を持たせます。`details` には投打、身長・体重、生年月日、経歴、ドラフトを構造化して保存し、NPBの原表記は `rawDetails` に保持します。各リソースの `data.attributes.*Stats[].raw` にNPBから取得した行データを保持し、同じ要素の `totals` と `metrics` に数値化した集計値・OPS、ISO、BB%、K%、ERA、WHIP、K/9、BB/9、K/BBを追加します。SQLiteはWebアプリなどから検索しやすい形に正規化した再生成可能な出力です。

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
  --db ../../data/sqlite/baseball.sqlite
```

`calculate` は個別リソースを再計算して同じディレクトリへ書き戻します。`--input <legacy-snapshot>` を指定すると、旧形式の集約JSONから個別リソースへ移行できます。`write-sqlite` は選手JSON全体からSQLiteを再構築します。

## Repository layout

- `packages/baseball-data`: 型、JSON I/O、派生スタッツ計算
- `scripts/parser`: NPBスクレイパー、派生JSON生成、Kysely + `better-sqlite3` writer
- `data/players/index.json`: 選手一覧のJSON APIリソース
- `data/players/<player-id>.json`: 1選手分のraw・集計値・派生スタッツ
- `data/sqlite`: SQLite出力（Git管理外）
- `docs/adr`: データ形式とSQLite出力の設計判断

## Verification

```sh
pnpm verify
```
