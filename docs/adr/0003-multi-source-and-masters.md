# ADR 0003: 複数ソースと正規化マスタをJSONで管理する

- Status: Accepted
- Date: 2026-08-19

## Decision

選手JSONの `data.attributes` はアプリケーションが利用する採用値（effective value）とし、ソースごとの原表記は `profile.rawDetails.<sourceId>` と成績行の `raw` に保存する。出典一覧は `meta.sources`、項目ごとの採用元・変換方法・更新日時は `meta.provenance` に保存する。

NPB公式、Wikipedia、人手編集を同じ形式で追加できるよう、ソースIDを固定の1件にせず、`official`、`encyclopedia`、`manual`、`computed` の種別を持たせる。スクレイピング値を後から上書きせず、採用値の変更理由を provenance に残せる構造にする。

マスタは `data/masters` にJSON API形式で置く。球団はフランチャイズの `teams`、名称と年度・リーグの対応は `team-names`、リーグは `leagues` に分ける。球団解決は部分一致ではなく `(name, season)` の正規化済み厳密一致を基本とし、1936〜1949年は `one_league` として表現する。学校は経歴から抽出した候補を `schools` に保持し、表記統合は手動編集で更新する。

SQLiteはJSONとマスタから再生成する。成績行には表示用の `team` を残しつつ、参照用の `team_id` / `league_id` を保存するため、アプリケーション側が球団名の文字列推論を行う必要はない。
