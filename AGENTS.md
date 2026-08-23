# baseball-stats 開発ガイド

## 目的

NPB公式サイトの公開選手データを取得し、raw SQLiteを正本として管理・公開する取得レイヤーのリポジトリです。

1. `data/raw/raw.sqlite`: スクレイピング結果と取得履歴（正本）
2. GitHub Pages: 検証済みの `data/raw/raw.sqlite` を毎回公開するサイト

加工（派生指標計算、マスタによる名寄せ、アプリ向けスキーマ、選手JSON APIのexport）は `npb-analysis` 側で行います。このリポジトリはraw SQLiteの生成とGitHub Pagesでの公開までで完結します。背景は [ADR 0007](docs/adr/0007-raw-only-scope-and-pages-publish-raw-sqlite.md) を参照してください。

## Runtime and package manager

- Node.js 26
- pnpm 11
- pnpm workspace + Turborepo
- SQLite access: Kysely + `better-sqlite3`
- Schema migrations: Atlas CLI

## Commands

```sh
pnpm install
pnpm verify

pnpm --filter @repo/parser run scrape -- --limit 3 --kana-limit 1 --debug --delay 300
pnpm --filter @repo/parser run scrape -- --scope daily --limit 3 --kana-limit 1 --debug --delay 300
pnpm --filter @repo/parser run validate-sqlite -- --db ../../data/raw/raw.sqlite
```

フルスクレイプはアクセス間隔を設け、依頼がない限り実行しません。NPBサイトへアクセスする検証では、必ず `--limit` と `--kana-limit` を使います。

## Change rules

- `npb.jp` のレスポンスは `data/raw/raw.sqlite` に実行単位（`scrape_runs`）で保存する。選手ページは全件をメモリに蓄積せず、1選手取得ごとにraw SQLiteへ保存する。`daily` scopeは現役選手と新規追加選手だけを取得する。raw SQLiteの列名・JSONキーは英語に正規化し、値は取得時の表記を保持する。
- raw SQLiteのテーブルや列を変更する場合はKyselyのスキーマ定義（`scripts/parser/src/raw-schema.ts`）、Atlas migration（`atlas/migrations/raw`）、関連テスト、ドキュメント（`docs/database-schema.md`）を同時に更新する。
- `packages/baseball-data` はraw生成に必要な型とNPB表記→英語キーの正規化関数だけを持つ。派生指標計算・マスタ・アプリ向けスキーマ・選手JSON APIは `npb-analysis` 側の責務であり、このリポジトリには追加しない。
- APIキー、Cookie、個人情報、認証情報はコミットしない。
- commit、push、PR作成、フルスクレイプは明示的な依頼がある場合だけ行う。

## Verification

変更後は、対象範囲に応じて次を実行します。

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
atlas migrate validate --env raw
```
