# baseball-stats 開発ガイド

## 目的

NPB公式サイトの公開選手データを取得し、選手ごとのJSON APIリソースを正本として管理するリポジトリです。

1. `data/players/index.json`: 選手一覧
2. `data/players/<player-id>.json`: 1選手分の原データ、集計値、派生スタッツ
3. `data/sqlite/data.sqlite`: アプリケーション向けの再生成可能なSQLite出力

選手JSONを正本とし、SQLiteはJSONと `data/masters` から再生成できる成果物として扱います。NPBの表記を保持する原データは `data.attributes.battingStats[].raw`、`data.attributes.pitchingStats[].raw`、`data.attributes.profile.rawDetails.npb` に入れます。Wikipediaや手動編集の原データは別の source ID に保存し、API利用向けの採用値は `data.attributes.profile.details` に構造化して入れます。出典は `meta.sources`、項目ごとの採用元は `meta.provenance` で管理します。

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

- `npb.jp` のレスポンスは各選手JSONの `data.attributes.*Stats[].raw` と `data.attributes.profile.rawDetails.npb` にそのまま保持し、計算値を上書きしない。
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
