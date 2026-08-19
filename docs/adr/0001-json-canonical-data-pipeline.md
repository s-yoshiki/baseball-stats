# ADR 0001: JSONを正本とするデータパイプライン

- Status: Accepted
- Date: 2026-08-19

## Context

NPBから取得した値を将来のアプリケーションでも再利用し、計算ロジックの変更時に再スクレイプせず再計算できるようにしたい。

## Decision

整形済みの値と派生値は、1選手1ファイルの `data/players/<player-id>.json` にJSON APIリソースとして保存する。プロフィールは姓・名・かな姓・かな名・登録名・登録名かなに分け、詳細情報は構造化した `details` に置く。NPB由来の未加工行データは `data/raw/raw.sqlite` に保存し、JSONの成績要素には数値化した集計値を `totals`、計算した派生値を `metrics` として置く。`data/players/index.json` は一覧リソースとする。アプリ向けSQLiteはJSONから再生成する出力とする。

## Consequences

raw値を保持したまま計算値を追加でき、個別選手の変更をGit差分とAPIレスポンスの単位で確認できる。計算式の変更時は全選手JSONを再計算する。
