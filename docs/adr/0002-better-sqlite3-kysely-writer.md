# ADR 0002: better-sqlite3 + KyselyをSQLite writerに使う

- Status: Accepted
- Date: 2026-08-19

## Context

`npb-analysis` の既存差分ではSQLite driverを `better-sqlite3` に統一している。データ基盤側でも同じdriverを使うことで、後からアプリケーションがこのSQLiteを直接読んでも挙動を揃えられる。

## Decision

SQLiteへの接続は `better-sqlite3`、クエリとスキーマ操作はKyselyの `SqliteDialect` を使う。writerはスナップショット全体をトランザクション内で再構築する。

## Consequences

型付きのテーブル定義を保ちつつ、Node.js向けの安定したSQLite driverを使える。writerは再実行可能だが、SQLiteの既存内容を置き換えるため、入力JSONを先に確認してから実行する。
