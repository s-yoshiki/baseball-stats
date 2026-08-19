# baseball-stats

NPB公式サイトの選手プロフィール・打撃成績・投手成績をJSONで保存し、派生スタッツを計算してSQLiteへ書き出すためのデータ基盤です。`npb-analysis` と同じく pnpm + Turborepo のモノレポ構成ですが、Webアプリから独立したデータリポジトリとして設計しています。

## Data pipeline

```text
NPB HTML
  ↓ scrape
data/raw/players.json
  ↓ calculate
data/derived/players.json
  ↓ write-sqlite
data/sqlite/baseball.sqlite
```

raw JSONは取得した値を保持し、派生JSONでは OPS、ISO、BB%、K%、ERA、WHIP、K/9、BB/9、K/BB と通算値を `computedStats` に追加します。SQLiteはWebアプリなどから検索しやすい形に正規化した出力です。

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

取得後、派生スタッツJSONとSQLiteを生成します。

```sh
pnpm --filter @repo/parser run calculate
pnpm --filter @repo/parser run write-sqlite
```

パスを指定する場合:

```sh
pnpm --filter @repo/parser run calculate -- \
  --input ../../data/raw/players.json \
  --output ../../data/derived/players.json

pnpm --filter @repo/parser run write-sqlite -- \
  --input ../../data/derived/players.json \
  --db ../../data/sqlite/baseball.sqlite
```

`write-sqlite` はスナップショット全体をSQLiteへ再構築します。派生JSONがない場合でも、raw JSONを `--input` に渡せば計算してから書き出せます。

## Repository layout

- `packages/baseball-data`: 型、JSON I/O、派生スタッツ計算
- `scripts/parser`: NPBスクレイパー、派生JSON生成、Kysely + `better-sqlite3` writer
- `data/raw`: NPBから取得したraw JSON
- `data/derived`: 計算済みのJSON
- `data/sqlite`: SQLite出力（Git管理外）
- `docs/adr`: データ形式とSQLite出力の設計判断

## Verification

```sh
pnpm verify
```
