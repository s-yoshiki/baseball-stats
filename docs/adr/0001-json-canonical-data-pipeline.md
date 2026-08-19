# ADR 0001: JSONを正本とするデータパイプライン

- Status: Accepted
- Date: 2026-08-19

## Context

NPBから取得した値を将来のアプリケーションでも再利用し、計算ロジックの変更時に再スクレイプせず再計算できるようにしたい。

## Decision

取得した値は `data/raw/players.json` に保存し、派生値は `data/derived/players.json` の `computedStats` に追加する。SQLiteはJSONから再生成する出力とする。

## Consequences

raw値と計算値の責務が分かれ、計算式の変更を追跡しやすい。一方、スナップショットは選手数に応じて大きくなるため、更新時は差分と生成日時を確認する。
