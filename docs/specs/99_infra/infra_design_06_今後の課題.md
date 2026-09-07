# 06. 今後の課題

[00_概要と全体構成](infra_design_00_概要と全体構成.md)〜[05_Cloud_Scheduler](infra_design_05_Cloud_Scheduler.md)の手動デプロイが一通り動くことを確認したあとに検討する。

## 1. CI/CD の自動化

手動デプロイ（[00](infra_design_00_概要と全体構成.md)〜[05](infra_design_05_Cloud_Scheduler.md)）が安定して動くことを確認できたため着手した。手順は [07_CI_CDの自動化](infra_design_07_CI_CDの自動化.md) を参照（タスク10）。

## 2. カスタムドメイン

初期版は Cloud Run が発行する既定の URL（`*.run.app`）をそのまま使う。家族内利用のみで URL を人に伝える機会がなく、独自ドメインを取得する費用（[6.7 コスト](../01_requirements/00_共通/01_プロダクト共通.md#67-コスト)の「月額費用を最小に保つ」に反する）に見合わないため。

## 3. Supabase バックアップの実測値確認

[00_概要と全体構成 4節](infra_design_00_概要と全体構成.md#4-未決事項の決定)で「無料プランの既定値をそのまま使う」と決めたが、実際の取得頻度・保持期間は [01_事前準備](infra_design_01_事前準備.md)でプロジェクトを作成したあと、Supabase の「Database」→「Backups」画面で確認し、[`docs/todo/notes/`](../../todo/notes/README.md)に実測値を残すこと。
