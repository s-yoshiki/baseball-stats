# ADR 0007: baseball-statsをraw取得層に専業化し、GitHub Pagesではrawを公開する

- Status: Accepted
- Date: 2026-08-23
- Supersedes: ADR 0006の「公開するのは加工済みSQLite」という前提

## Context

利用者が役割分担を次のように決めた。

- `baseball-stats`（このリポジトリ）: npb.jpをスクレイプし、raw SQLite（`data/raw/raw.sqlite`）だけを保持してGitHub Pagesで公開する取得層
- `npb-analysis`: 公開されたrawをデプロイ時に取得し、アプリ用に最適化したDBを生成してデプロイする加工層

これまでは`baseball-stats`自身がraw SQLiteから加工済み（published）SQLite（`data/sqlite/data.sqlite`）を再生成し、その加工済みSQLiteをGitHub Pagesで公開していた（[ADR 0004](0004-sqlite-canonical-and-atlas-migrations.md)、[ADR 0006](0006-github-pages-for-public-sqlite-distribution.md)）。派生指標の計算、マスタによる球団・学校の名寄せ、アプリ向けスキーマの構築といった加工工程は、`npb-analysis`側に同等の実装がすでに移設済みであり、両リポジトリで同じ加工ロジックを二重に保守する状態になっていた。

`npb-analysis`はデプロイ時にS3から取得する構成へ一時的に移行する計画もあったが、利用者は最終的に「`baseball-stats`はraw取得・公開に専業化し、`npb-analysis`が加工を担う」という役割分担を採用した。

日次差分run（`daily` scope）は、前回成功runのraw SQLiteをActions artifact（`baseball-stats-raw`、retention 30日）から`gh run download`で復元して基準にしていた。retentionが切れると基準を失い、意図せず全選手の再取得（フルスクレイプ）が必要になる制約があった。

## Decision

`baseball-stats`をraw取得・公開に専業化する。

- `scripts/parser/src/sqlite.ts`（publishedスキーマとwriter）、`write-sqlite.ts`、`export-json.ts`を削除し、raw SQLiteの生成（`scripts/parser/src/main.ts`）で完結させる。加工工程（派生指標計算、マスタ、アプリ用スキーマ、選手JSON export）は`npb-analysis`側の実装に一本化する
- `data/masters`（マスタJSON）と、`atlas.hcl`の`published`env・`atlas/migrations/published/`を削除する。raw環境（`raw`env・`atlas/migrations/raw/`）は変更せず、引き続きAtlas + Kyselyで管理する
- `.github/workflows/publish-sqlite.yml`（現役ロースターの再公開専用workflow）を削除する。published生成が無くなったため役目が無い
- `validate-sqlite.ts`と`publish-counts.ts`は、publishedの行数（`players` / `batting_rows` / `pitching_rows`）ではなく、rawの`scrape_runs`件数と`raw_players`の`COUNT(DISTINCT player_id)`を検証・出力するよう作り替える。`build-release-metadata.ts` / `release-metadata.ts`も同様にraw向けの`players` / `runs`を持つ`metadata.json`を出力する
- `daily-scrape.yml`は、GitHub Pagesへ公開するファイルを加工済みSQLite（`data.sqlite`ほか）からrawの4ファイルに差し替える。

  ```text
  https://s-yoshiki.github.io/baseball-stats/raw.sqlite
  https://s-yoshiki.github.io/baseball-stats/raw.sqlite.sha256
  https://s-yoshiki.github.io/baseball-stats/metadata.json
  https://s-yoshiki.github.io/baseball-stats/index.html
  ```

  ファイル構成・チェックサム形式・`metadata.json`のフィールド設計（`source_sha` / `source_run_id` / `generated_at` / `scope` に加えて規模を示す値）は[ADR 0006](0006-github-pages-for-public-sqlite-distribution.md)の設計をそのまま踏襲する。`players` / `batting_rows` / `pitching_rows`だった規模フィールドを、rawの規模を表す`players`（`COUNT(DISTINCT player_id)`）/ `runs`（`scrape_runs`件数）に置き換える点だけが異なる。Pages公開ジョブの構成（`upload-pages-artifact` + `deploy-pages`、`concurrency: pages`での直列化、ビルドジョブは`contents: read`・デプロイジョブだけ`pages: write` / `id-token: write`）はADR 0006の決定をそのまま維持する
- 日次差分（`daily` scope）の基準を、Actions artifactの`gh run download`から、自分がGitHub Pagesへ公開した`raw.sqlite`の取得に切り替える。

  ```sh
  curl -fL --retry 5 -H "Cache-Control: no-cache" https://s-yoshiki.github.io/baseball-stats/raw.sqlite -o data/raw/raw.sqlite
  ```

  取得後は同時に公開されている`raw.sqlite.sha256`と突き合わせて検証してから使う。これにより、Actions artifactのretention（30日）に基準runの寿命が縛られる制約が解消される——Pages上の`raw.sqlite`は直近の公開ワークフローが常に最新へ上書きしており、寿命を持たない
- **移行期間の配慮**: 本ADR適用時点ではPagesにまだrawが一度もpublishされておらず、最初の実行ではPagesからの取得が404になる。そのため、Pagesからの取得に失敗した場合は既存のActions artifact復元（`gh run download`）にフォールバックする経路を残す。両方失敗した場合、`scope=all`ならbaseline作り直しとして続行し、それ以外のscopeでは失敗させる（`daily`/`active`で意図しないフルスクレイプが走ることを防ぐため）。artifactフォールバックは初回publish後に不要になる暫定措置であり、ワークフロー内にその旨をコメントで明記する
- raw artifact（`baseball-stats-raw`、retention 30日）のアップロード自体はバックアップとして当面残す

## Consequences

- `baseball-stats`と`npb-analysis`で加工ロジックを二重に保守する必要がなくなり、派生指標・マスタ・アプリ用スキーマの変更は`npb-analysis`側だけで完結する
- `baseball-stats`のGitHub Pagesが公開するデータの性質が「加工済みSQLite」から「raw SQLite」に変わる。`npb-analysis`側はデプロイ時の取得・変換ロジックをrawの取り込みに合わせて実装する必要がある（`npb-analysis`側の対応は本ADRの範囲外）
- 日次差分の基準がActions artifactのretention（30日）に縛られなくなり、長期間ワークフローを実行しなくても直近の公開物を基準に差分runを続けられる
- 初回publishが完了するまでは、Pages取得失敗時にActions artifactへフォールバックする暫定コードパスが残る。初回publish後はこのフォールバックを削除できる
- 加工済みSQLite・選手JSON export・マスタ管理は`baseball-stats`のスコープ外になる。これらが必要な場合は`npb-analysis`側のドキュメントを参照する

## Update

GitHub Pagesへのraw.sqlite初回publish（run `32631015731`）が成功し、`npb-analysis`側もこのPagesサイトを参照する経路への切替を完了した。これに伴い、上記「移行期間の配慮」で残していた暫定措置を解消した。

- `daily-scrape.yml`の`Restore previous raw SQLite`ステップから、Actions artifact復元（`gh run download`）へのフォールバック経路を削除した。GitHub Pagesからの取得とsha256検証のみで完結する。取得に失敗した場合の扱いは変更していない（`scope=all`ならbaseline作り直しとして続行、それ以外は`::error::`で失敗させる）
- `gh run list` / `gh run download`を使わなくなったため、`daily-scrape.yml`の`permissions`から`actions: read`と、対応する`GH_TOKEN`の受け渡しを削除した
- raw artifact（`baseball-stats-raw`、retention 30日）のアップロード自体は、Pagesが壊れた場合のバックアップとして引き続き残す
- `Daily scrape`のschedule（`cron: "0 18 * * *"`、03:00 JST）を復活させた。`npb-analysis`のDeployは`cron: "0 20 * * *"`（05:00 JST）でPagesのraw.sqliteを取得するため、`daily-scrape.yml`の開始時刻や`timeout-minutes: 90`を変更してこの時間関係を崩す場合は、`npb-analysis`側のDeploy cronも合わせて見直す必要がある
