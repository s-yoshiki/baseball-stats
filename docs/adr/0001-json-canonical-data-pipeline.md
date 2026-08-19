# ADR 0001: JSONを正本とするデータパイプライン

- Status: Superseded by ADR 0004
- Date: 2026-08-19

## Context

NPBから取得した値を将来のアプリケーションでも再利用し、計算ロジックの変更時に再スクレイプせず再計算できるようにしたい。

## Decision

整形済みの値と派生値は、必要時にraw SQLiteからJSON APIリソースへexportする。プロフィールは姓・名・かな姓・かな名・登録名・登録名かなに分け、詳細情報は構造化した `details` に置く。アプリ向けSQLiteを管理対象の公開データとして利用する。

## Consequences

raw値を保持したまま計算値をSQLiteへ再生成でき、計算式の変更時もJSONファイル群を更新せずに済む。必要な利用者だけJSON exportを実行する。
