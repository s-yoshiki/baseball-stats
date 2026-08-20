# ADR 0005: 公開用SQLiteをGitHub Pagesで配布する

- Status: Accepted
- Date: 2026-08-21

## Context

`npb-analysis` はデプロイ時に `baseball-stats` が生成した公開用SQLite（`data/sqlite/data.sqlite`）を取得し、自スキーマへ変換してデプロイする。これまでは Actions artifact `baseball-stats-sqlite`（retention 14日）を `repository_dispatch` で通知し、`npb-analysis` 側がartifactをダウンロードしていた。

`baseball-stats` を public にしても、Actions artifactのZIPダウンロードは匿名アクセスでは401になり、tokenが必須であることが実測で確認された。この制約を避けるため、一度は `db-latest` というrolling tagのGitHub Releaseへ公開する方式を実装した（`gh release view` による存在確認＋`gh release create`/`edit` + `gh release upload --clobber`）。しかしこの実装がマージされた後、利用者の判断で配布経路を GitHub Pages に変更することになった。

公開用SQLiteの取得範囲（`scope`）は配布方式とは独立した下流の要件でもある。`npb-analysis` は引退選手を含む約7900選手分のデータを前提に最低選手数（デフォルト5000）のチェックを行うため、`scope=active`（実測 `players=1072`）のみで生成した公開DBはこのチェックで弾かれる。フル取得（`scope=all`）は `Daily scrape` の役割とし、`Publish SQLite` は現役ロースターの再公開に用途を絞る（詳細は両ワークフローの `scope` 入力のコメントを参照）。

## Decision

公開用SQLiteを、`baseball-stats` の GitHub Pages サイトへ次の4ファイルとして公開する。

- `data.sqlite`: 公開用SQLite本体
- `data.sqlite.sha256`: `sha256sum` 形式のチェックサム（`<hash>  data.sqlite`）。ダウンロード後の検証用
- `metadata.json`: `source_sha`、`source_run_id`、`generated_at`、`scope`、`players`、`batting_rows`、`pitching_rows` を持つJSON。取得元の由来と規模を人・機械の両方が確認できるようにする
- `index.html`: データセットの説明、3ファイルへのリンク、最新の生成日時・行数・出典（npb.jp）・再生成される旨を記載した最小限のページ。素の404を返さないために必ず配置する

`Daily scrape`（`.github/workflows/daily-scrape.yml`）と `Publish SQLite`（`.github/workflows/publish-sqlite.yml`）は、いずれも既存の `Validate SQLite snapshot` / `Validate published SQLite` の後にこの4ファイルを `site/` ディレクトリへ組み立て、`actions/upload-pages-artifact@v3` でアップロードする。デプロイは専用の `deploy-pages` ジョブで `actions/deploy-pages@v4` を使って行う。`metadata.json`の生成（`build-release-metadata`）とチェックサムの生成は、GitHub Release方式のときと同じ実装（同じファイル名・同じスキーマ）をそのまま流用する。

```text
https://s-yoshiki.github.io/baseball-stats/data.sqlite
https://s-yoshiki.github.io/baseball-stats/data.sqlite.sha256
https://s-yoshiki.github.io/baseball-stats/metadata.json
https://s-yoshiki.github.io/baseball-stats/index.html
```

**この方式が成立するのは `baseball-stats` が public リポジトリである場合のみである。** private リポジトリでは Pages サイト自体が誰でも閲覧できる状態になってしまうため、データを非公開に保ちたい場合はこの方式を使えない。

Pages の有効化（`build_type = "workflow"`）そのものは、このリポジトリのワークフローでは行わない。`github-terraform` リポジトリの `pages.tf` でTerraform管理し、ワークフロー側は有効化済みであることを前提にする。そのため `actions/configure-pages` の `enablement: true` は使わない。

デプロイジョブの権限は `pages: write` と `id-token: write` のみを付与し、ビルドジョブ（スクレイプ・SQLite生成・サイト組み立て）の `permissions.contents` は Release方式で必要だった `write` から `read` に戻す。複数ワークフロー（`daily-scrape` / `publish-sqlite`）が同じPagesサイトへデプロイし得るため、デプロイジョブには専用の `concurrency: group: "pages"`（`cancel-in-progress: false`）を設定し、各ワークフロー全体の既存concurrency（`daily-scrape` / `publish-sqlite`）とは独立して直列化する。

既存のActions artifact（`baseball-stats-sqlite` / `baseball-stats-raw`）はそのまま残す。`baseball-stats-raw` は `daily` scopeの差分run復元に使われており、`baseball-stats-sqlite` はデバッグ用途で引き続き有用なため、置き換えずに併存させる。

`npb-analysis` への `repository_dispatch`（`baseball-stats-updated`）通知は行わない。`npb-analysis` は `NPB_ANALYSIS_DISPATCH_TOKEN`（`baseball-stats` へのアクセス権を持つPAT）を使うevent駆動のデプロイから、自身の `push: main` / `schedule`（毎日05:00 JST） / `workflow_dispatch` によるデプロイに切り替えたため、`baseball-stats` からの通知を受け取る先がなくなった。これにより `Check cross-repository dispatch secret` と `Notify npb-analysis` の両ステップを両ワークフローから削除し、`baseball-stats` は `NPB_ANALYSIS_DISPATCH_TOKEN` を一切保持・参照しなくなる。

行数（`players` / `batting_rows` / `pitching_rows`）の算出は変更しない。引き続き `scripts/parser/src/publish-counts.ts` の `readPublishedCounts` を `validate-sqlite` と `build-release-metadata` の両方から呼び出し、同じSQLiteを二重に開かないようにする。

## Alternatives considered

- **GitHub Release の rolling tag（`db-latest`）**: 一度実装しマージまでした方式。Release assetは公開リポジトリであれば匿名ダウンロードできるが、Releaseの作成・更新に `contents: write` が必要でActions tokenの権限が広がる。また `gh release upload --clobber` による上書きのたびにRelease全体のメタデータ（notes等）も書き換わり、Pages方式に比べてワークフロー側のロジックが複雑になる。Pages はリポジトリがpublicであれば追加の権限昇格なしに同じ匿名ダウンロード性質を得られるため、この案は採用しなかった。
- **Actions artifact のみ（従来方式）**: 実測でZIPダウンロードが匿名アクセスでは401になり、tokenが必須であることが確認された。retention 14日の制約もある。`npb-analysis` にtokenを持たせずに済ませたいため採用しなかった（デバッグ・差分復元用途では引き続き併用する）。

## Consequences

- `npb-analysis` はSQLite取得用のtokenを持たなくてよくなり、Actions artifactのretention 14日の制約も受けない
- `npb-analysis` がevent駆動（`repository_dispatch`）から自身の`schedule`/`push`駆動に切り替わったため、`baseball-stats`側は`NPB_ANALYSIS_DISPATCH_TOKEN`シークレットの登録・維持が不要になる
- サイト全体1GB・帯域月100GBというGitHub Pagesのソフトリミットの対象になる。公開用SQLite単体のサイズやアクセス頻度がこれに収まることを前提にしており、超過した場合は別の配布方式を再検討する必要がある
- デプロイのたびに公開ツリー全体が置き換わるため、GitHub Releaseのようなバージョン履歴は残らない。過去バージョンが必要な場合はActions artifact（`baseball-stats-sqlite`、retention 14日）かrun履歴を参照する必要がある
- Pages サイトはリポジトリの可視性に関わらず誰でも閲覧できるURLを持つため、`baseball-stats` を private に戻す判断をする場合、この配布方式はそのままでは使えない（Pagesサイト自体を無効化するか、別の非公開配布手段に切り替える必要がある）
- Pages の有効化は `github-terraform` のTerraformで管理するため、このリポジトリのワークフローだけでは完結しない。初回デプロイ前に `github-terraform` 側でPagesの有効化（`build_type = "workflow"`）が完了している必要がある
