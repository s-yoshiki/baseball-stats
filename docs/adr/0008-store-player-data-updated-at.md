# ADR 0008: 選手単位のデータ最終取得日時をrawに保存する

- Status: Accepted
- Date: 2026-08-29

## Context

`raw_players`はrunごとの選手データを保持しているが、選手ページを最後に
取得した日時を直接保持していなかった。`scrape_runs.completed_at`はrun全体の
完了日時であり、`daily` scopeのように選手を順番に取得する処理では個々の
選手データの更新日時としては粗すぎる。

## Decision

選手ページのHTTP取得完了直後にUTCのISO 8601文字列を作り、
`raw_players.updated_at`へ保存する。既存raw SQLiteへ列を追加する際は、
既存行をrunの`completed_at`（未完了なら`started_at`）で補完する。

## Consequences

- downstreamの`npb-analysis`が選手単位のデータ更新日時を表示できる。
- raw SQLiteのスキーマ、Atlas migration、型、テストを同時に更新する必要がある。
- 過去行の補完値は厳密な選手ページ取得時刻ではなく、移行後の新規行から正確な値になる。

## Alternatives considered

### `scrape_runs.completed_at`だけを使う

不採用。run内の選手ごとの取得時刻を表現できない。
