# ADR 0005: 公開用SQLiteをGitHub Releaseの匿名DL可能なassetとして配布する

- Status: Accepted
- Date: 2026-08-20

## Context

`npb-analysis` はデプロイ時に `baseball-stats` が生成した公開用SQLite（`data/sqlite/data.sqlite`）を取得し、自スキーマへ変換してデプロイする。これまでは Actions artifact `baseball-stats-sqlite`（retention 14日）を `repository_dispatch` で通知し、`npb-analysis` 側がartifactをダウンロードしていた。

しかし実測で、`baseball-stats` を public にしても、Actions artifactのZIPダウンロードは匿名アクセスでは401になり、tokenが必須であることが確認された（`gh api` の一覧取得は匿名200、Release assetのダウンロードは匿名200）。artifact方式のままだと、`npb-analysis` はpublicリポジトリを参照するだけのために `baseball-stats` へのアクセス権を持つtokenを保持し続ける必要があり、artifactのretention 14日という制約も残る。

## Decision

公開用SQLiteを、`db-latest` というrolling tag（targetは常に `main`）のGitHub Releaseへ、次の3つのassetとして公開する。

- `data.sqlite`: 公開用SQLite本体
- `data.sqlite.sha256`: `sha256sum` 形式のチェックサム（`<hash>  data.sqlite`）。ダウンロード後の検証用
- `metadata.json`: `source_sha`、`source_run_id`、`generated_at`、`scope`、`players`、`batting_rows`、`pitching_rows` を持つJSON。取得元の由来と規模を人・機械の両方が確認できるようにする

`Daily scrape`（`.github/workflows/daily-scrape.yml`）と `Publish SQLite`（`.github/workflows/publish-sqlite.yml`）は、いずれも既存の `Validate SQLite snapshot` / `Validate published SQLite` の後にこの3 assetを作り、`gh release view` で存在確認したうえで `gh release create` / `gh release edit` + `gh release upload --clobber` を使って `db-latest` を毎回上書き更新する。Release作成には `contents: write` 権限が必要なため、両ワークフローの `permissions` を最小限で更新する。

Release assetは公開リポジトリであれば匿名ダウンロードが可能なため、`npb-analysis` 側はダウンロード用のtokenを持つ必要がなくなる。

```text
https://github.com/s-yoshiki/baseball-stats/releases/download/db-latest/data.sqlite
```

**この方式が成立するのは `baseball-stats` が public リポジトリである場合のみである。** privateのままではRelease assetも匿名ダウンロードできないため、public化そのものは別途判断・実施する必要がある。

既存のActions artifact（`baseball-stats-sqlite` / `baseball-stats-raw`）はそのまま残す。`baseball-stats-raw` は `daily` scopeの差分run復元（前回runのraw SQLiteを`gh run download`で取得）に使われており、`baseball-stats-sqlite` はデバッグ用途で引き続き有用なため、置き換えずに併存させる。`repository_dispatch` による `npb-analysis` への通知も残すが、payloadはRelease方式に合わせて `release_tag: "db-latest"` を含める形に更新し、Release方式では意味を持たなくなった `artifact_name` は削除する。`npb-analysis` はprivateリポジトリのままなので、この通知には引き続き `NPB_ANALYSIS_DISPATCH_TOKEN` を使う。

行数（`players` / `batting_rows` / `pitching_rows`）は、既存の `validate-sqlite`（`scripts/parser/src/validate-sqlite.ts`）が算出するカウントをそのまま再利用する。カウントのSQLは `scripts/parser/src/publish-counts.ts` に切り出し、`validate-sqlite` と新設の `build-release-metadata`（`scripts/parser/src/build-release-metadata.ts`）の両方から呼び出すことで、同じSQLiteを二重に開かずに済むようにした。

## Consequences

- `npb-analysis` はSQLite取得用のtokenを持たなくてよくなり、retention 14日の制約もなくなる
- `db-latest` はrolling tagのため履歴を持たない。過去バージョンが必要になった場合は、別途Actions artifact（`baseball-stats-sqlite`、retention 14日）かrun履歴を参照する必要がある
- Release作成のために `contents: write` をActions tokenへ付与する必要があり、ワークフローの権限が広がる
- `baseball-stats` を public にする判断・実施は本ADRの範囲外であり、別途行う
