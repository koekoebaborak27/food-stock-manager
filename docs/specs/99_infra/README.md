# 99_infra/ — インフラ構築手順

本番環境の構成と、構築手順を**手順ごとに分割**して置く。1 ファイルが長くなるとエージェントも人も読めなくなるため、番号を振って分ける。

```
99_infra/
├─ README.md                              ← この索引
├─ infra_design_00_概要と全体構成.md        ← 構成図・デプロイの順序・未決事項の決定
├─ infra_design_01_事前準備.md              ← GCPプロジェクト・Supabase・Google OAuthクライアント
├─ infra_design_02_Artifact_Registry.md    ← イメージ置き場の作成・ビルド&push
├─ infra_design_03_Secret_Manager.md       ← 環境変数の秘密値の登録
├─ infra_design_04_Cloud_Run.md            ← api→webの順でのデプロイ・動作確認
├─ infra_design_05_Cloud_Scheduler.md      ← 期限通知の配信バッチの定期実行
├─ infra_design_06_今後の課題.md            ← カスタムドメイン等、後回しにした事項
└─ infra_design_07_CI_CDの自動化.md         ← GitHub ActionsからCloud Runへの自動デプロイ（Workload Identity連携）
```

読む順序は [`infra_design_00_概要と全体構成.md`](infra_design_00_概要と全体構成.md) の「デプロイの順序」に従うこと。

書くときの注意:

- **実際の値（プロジェクト番号・本番URL・接続文字列）を書かない。** `<プロジェクトID>` のようなプレースホルダにする。
- 画面のクリック手順は、その画面の名称と押すボタン名まで書く（後から自分で再現できるように）。
- 手順の途中で決めた設定値は、`docs/todo/notes/` ではなくここに残す（構築手順の一部のため）。
