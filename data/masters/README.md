# Master data

このディレクトリは、選手JSONから参照する正規化マスタをJSON API形式で管理します。

- leagues.json: 一リーグ制・セ・リーグ・パ・リーグ
- teams.json: フランチャイズ単位の球団（解散球団・戦前球団を含む）
- team-names.json: (teamId, season) を解決する球団名・年度・リーグの対応表
- schools.json: 経歴から抽出した学校候補。名称の追加・統合は手動編集できます

選手JSONと同じく、値は `data` に置きます。出典情報やprovenanceは管理しません。球団の系譜や名称期間は断定せず、内容を確認したうえで手動編集してください。SQLiteはこれらのJSONを読み込んで再生成します。

team-names.json は npb-analysis の TEAM_SEEDS / team_seasons 設計を参考に、部分一致ではなく球団名と年度の組で解決できる形にしています。1936〜1949年は one_league として扱います。
