# ADR 0004: SQLiteを選手データの正本としAtlasでスキーマを管理する

- Status: Accepted
- Date: 2026-08-20

## Decision

選手のスクレイピング結果は `data/raw/raw.sqlite` に保存し、raw DBの最新実行から `data/sqlite/data.sqlite` を再生成する。選手JSONはGit管理せず、必要時にexportする。

KyselyをTypeScriptの型・クエリ・スキーマビルダーとして利用し、Atlasのexternal schema loaderからKyselyが生成したDDLを読み込む。スキーマ差分と適用用SQLは `atlas/migrations/raw` と `atlas/migrations/published` で管理する。

## Consequences

- 選手JSONの大量差分やバイナリSQLiteのGit管理が不要になる
- raw DBは実行単位の履歴を持ち、最新実行を公開DBへ反映できる
- JSON APIが必要になった場合も、raw DBから再現可能なexportとなる
- スキーマ変更時はKyselyの型・builder、Atlas migration、SQLiteテストを同時に更新する
