# ADR 0003: 複数ソースと正規化マスタをJSONで管理する

- Status: Accepted
- Date: 2026-08-19

## Decision

NPBの未加工データは `data/raw/raw.sqlite` に保存し、選手JSONは必要時のexportとする。現時点ではWikipediaや人手編集、出典一覧、ソースID、項目単位のprovenanceは管理しない。

マスタは `data/masters` にJSON API形式で置く。球団はフランチャイズの `teams`、名称と年度・リーグの対応は `team-names`、リーグは `leagues` に分ける。球団解決は部分一致ではなく `(name, season)` の正規化済み厳密一致を基本とし、1936〜1949年は `one_league` として表現する。学校は経歴から抽出した候補を `schools` に保持し、表記統合は手動編集で更新する。

SQLiteはraw SQLiteとマスタから再生成する。成績行には表示用の `team` を残しつつ、参照用の `team_id` / `league_id` を保存するため、アプリケーション側が球団名の文字列推論を行う必要はない。
