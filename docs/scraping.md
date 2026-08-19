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

- `--scope active|all`: 現役選手または全選手。デフォルトは `active`
- `--limit <number>`: 取得する選手数
- `--kana-limit <number>`: 取得するかな別インデックス数
- `--delay <ms>`: リクエスト間隔。デフォルトは300ms
- `--raw-db <path>`: raw SQLiteの出力先
- `--db <path>`: 公開SQLiteの出力先
- `--masters-dir <path>`: マスタJSONディレクトリ
- `--debug`: URL、選手、抽出行数を表示

サイトの負荷を避けるため、開発・検証では必ず小さいlimitを指定します。フルスクレイプでは `--scope all` と十分な `--delay` を明示してください。

HTMLの変更により列名が変わる可能性があるため、raw SQLiteの最新実行を検証します。選手ページは全件をメモリに保持せず、1選手を取得するたびにraw SQLiteへ保存します。スクレイプ時に派生スタッツを計算し、公開SQLiteまで再生成します。必要な場合だけ `export-json` でJSON APIリソースを出力します。
