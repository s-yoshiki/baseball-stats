# baseball-stats 開発ガイド

## 目的

NPB公式サイトの公開選手データを取得し、SQLiteを正本として管理するリポジトリです。

1. `data/raw/raw.sqlite`: スクレイピング結果と取得履歴
2. `data/sqlite/data.sqlite`: アプリケーション向けの再生成可能なSQLite出力
3. `data/export/players/*.json`: 必要時だけ生成するAPI向けJSON

スクレイピングした原データは `data/raw/raw.sqlite` に保存し、公開用SQLiteはそこから再生成します。

選手JSONはGit管理せず、必要時にraw SQLiteからexportします。マスタは `data/masters` のJSONで管理します。現時点では手動編集・provenanceは管理しません。

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
pnpm --filter @repo/parser run write-sqlite
pnpm --filter @repo/parser run export-json
```

フルスクレイプはアクセス間隔を設け、依頼がない限り実行しません。NPBサイトへアクセスする検証では、必ず `--limit` と `--kana-limit` を使います。

## Change rules

- `npb.jp` のレスポンスは `data/raw/raw.sqlite` に実行単位で保存する。選手ページは全件をメモリに蓄積せず、1選手取得ごとにraw SQLiteへ保存する。daily scopeは現役選手と新規追加選手だけを取得し、公開DB生成時に完了済みrunの選手ごとの最新行を統合する。raw SQLiteの列名・JSONキーは英語に正規化し、値は取得時の表記を保持する。整形済みJSONには取得用の日本語キーを残さない。
- 派生値は `packages/baseball-data/src/stats.ts` の純粋関数で計算する。
- JSON exportのスキーマを変更した場合は README、関連テスト、サンプルデータを更新する。
- マスタを追加・修正する場合は `data/masters/README.md` と `scripts/parser/src/sqlite.ts` の取り込み処理を確認する。
- SQLiteのテーブルや列を変更する場合はKyselyのスキーマ定義、Atlas migration、関連テスト、ドキュメントを同時に更新する。
- APIキー、Cookie、個人情報、認証情報はコミットしない。
- commit、push、PR作成、フルスクレイプは明示的な依頼がある場合だけ行う。

## Verification

変更後は、対象範囲に応じて次を実行します。

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
```
