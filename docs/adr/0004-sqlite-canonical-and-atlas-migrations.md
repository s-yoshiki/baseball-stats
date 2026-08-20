# ADR 0004: SQLiteを選手データの正本としAtlasでスキーマを管理する

- Status: Accepted
- Date: 2026-08-20

## Decision

選手のスクレイピング結果は `data/raw/raw.sqlite` に実行単位で保存し、完了済みrunの選手ごとの最新行を統合して `data/sqlite/data.sqlite` を再生成する。選手JSONはGit管理せず、必要時にexportする。日次runは現役選手と新規追加選手だけを含む差分runとして保存できる。

KyselyをTypeScriptの型・クエリ・スキーマビルダーとして利用し、Atlasのexternal schema loaderからKyselyが生成したDDLを読み込む。スキーマ差分と適用用SQLは `atlas/migrations/raw` と `atlas/migrations/published` で管理する。

## Consequences

- 選手JSONの大量差分やバイナリSQLiteのGit管理が不要になる
- raw DBは実行単位の履歴を持ち、差分runを含む選手ごとの最新状態を公開DBへ反映できる
- JSON APIが必要になった場合も、raw DBから再現可能なexportとなる
- スキーマ変更時はKyselyの型・builder、Atlas migration、SQLiteテストを同時に更新する
