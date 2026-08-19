# baseball-stats 開発ガイド

## 目的

NPB公式サイトの公開選手データを取得し、選手ごとのJSON APIリソースを正本として管理するリポジトリです。

1. `data/players/index.json`: 選手一覧
2. `data/players/<player-id>.json`: 1選手分のAPI向け整形済みデータ、集計値、派生スタッツ
3. `data/sqlite/data.sqlite`: アプリケーション向けの再生成可能なSQLite出力

スクレイピングした原データは `data/raw/raw.sqlite` に保存し、Git管理対象の選手JSONとは分離します。

選手JSONをAPI向けの正本とし、SQLiteはJSONと `data/masters` から再生成できる成果物として扱います。NPBの純粋な取得データは `data/raw/raw.sqlite` に保存します。Wikipediaや手動編集の値は整形済みJSONへ反映します。出典や項目単位のprovenanceは管理しません。

## Runtime and package manager

- Node.js 26
- pnpm 11
- pnpm workspace + Turborepo
- SQLite access: Kysely + `better-sqlite3`

## Commands

```sh
pnpm install
pnpm verify

pnpm --filter @repo/parser run scrape -- --limit 3 --kana-limit 1 --debug --delay 300
pnpm --filter @repo/parser run calculate
pnpm --filter @repo/parser run write-sqlite
```

フルスクレイプはアクセス間隔を設け、依頼がない限り実行しません。NPBサイトへアクセスする検証では、必ず `--limit` と `--kana-limit` を使います。

## Change rules

- `npb.jp` のレスポンスは `data/raw/raw.sqlite` にそのまま保存し、整形済みJSONには取得用の日本語キーを残さない。
- 派生値は `packages/baseball-data/src/stats.ts` の純粋関数で計算する。
- JSONのスキーマを変更した場合は README、関連テスト、サンプルデータを更新する。
- マスタを追加・修正する場合は `data/masters/README.md` と `scripts/parser/src/sqlite.ts` の取り込み処理を確認する。
- SQLiteのテーブルや列を変更する場合は `scripts/parser/src/sqlite.ts` とドキュメントを同時に更新する。
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
