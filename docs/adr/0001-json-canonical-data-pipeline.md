# ADR 0001: JSONを正本とするデータパイプライン

- Status: Accepted
- Date: 2026-08-19

## Context

NPBから取得した値を将来のアプリケーションでも再利用し、計算ロジックの変更時に再スクレイプせず再計算できるようにしたい。

## Decision

取得した値と派生値は、1選手1ファイルの `data/players/<player-id>.json` にJSON APIリソースとして保存する。プロフィールは姓・名・かな姓・かな名・登録名・登録名かなに分け、NPB由来の行データは `data.attributes.*Stats[].raw`、数値化した集計値は `totals`、計算した派生値は `metrics` に置く。`data/players/index.json` は一覧リソースとする。SQLiteはJSONから再生成する出力とする。

## Consequences

raw値を保持したまま計算値を追加でき、個別選手の変更をGit差分とAPIレスポンスの単位で確認できる。計算式の変更時は全選手JSONを再計算する。
