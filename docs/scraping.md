# Scraping

対象は `https://npb.jp/bis/players/` 配下の公開ページです。スクレイパーは選手インデックス、かな別インデックス、選手詳細ページの順に取得します。

```sh
pnpm --filter @repo/parser run scrape -- \
  --scope active \
  --limit 3 \
  --kana-limit 1 \
  --delay 300 \
  --debug
```

オプション:

- `--scope daily|active|all`: `daily` は現役選手と新規追加選手、`active` は現役選手、`all` は全選手。デフォルトは `active`
- `--limit <number>`: 取得する選手数
- `--kana-limit <number>`: 取得するかな別インデックス数
- `--delay <ms>`: リクエスト間隔。デフォルトは300ms
- `--raw-db <path>`: raw SQLiteの出力先。デフォルトは `data/raw/raw.sqlite`
- `--debug`: URL、選手、抽出行数を表示

`daily` は `--raw-db` に保存済みの完了済みrunから既知の選手IDを読み込み、現役選手は毎回、全選手インデックスに新しく現れた選手は追加で取得します。取得済みの引退選手はraw SQLiteの過去runから引き継ぎます。初回や互換性のないraw SQLiteの場合は既知IDが空になるため、dailyでも全選手が取得対象になります。

サイトの負荷を避けるため、開発・検証では必ず小さいlimitを指定します。フルスクレイプでは `--scope all` と十分な `--delay` を明示してください。

HTMLの変更により抽出結果が変わる可能性があるため、動作確認では `--limit` と `--kana-limit` を指定してください。選手ページは全件をメモリに保持せず、1選手を取得するたびにraw SQLiteへ保存します。このリポジトリはraw SQLiteを生成してGitHub Pagesへ公開します。派生スタッツやアプリ向けデータの生成は `npb-analysis` 側で行います。
