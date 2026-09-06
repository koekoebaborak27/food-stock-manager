# 06. 今後の課題

[00_概要と全体構成](infra_design_00_概要と全体構成.md)〜[05_Cloud_Scheduler](infra_design_05_Cloud_Scheduler.md)の手動デプロイが一通り動くことを確認したあとに検討する。

## 1. CI/CD の自動化

現状は `git push` や `main` へのマージが Cloud Run への反映につながらない（手動での `docker build` → `push` → `gcloud run deploy` が必要）。GitHub Actions から Artifact Registry への push・Cloud Run へのデプロイまで自動化する案があるが、次の理由でこのタイミングでは実装しない。

- GitHub Actions から GCP を操作するには Workload Identity 連携（サービスアカウントキーを使わない認証方式）の設定が要り、GCP プロジェクト側の準備（サービスアカウント作成・IAM 権限付与・Workload Identity プールの作成）が本ドキュメントの手動デプロイ手順と重複する。まず手動デプロイで一通り動くことを確認し、各手順で必要な IAM 権限が明確になってから自動化した方が手戻りが少ない。
- 個人の学習用途であり、デプロイ頻度が高くない。自動化のメリットより設定の手間が上回る段階。

着手する場合は、[.github/workflows/ci.yml](../../../.github/workflows/ci.yml) の `verify` ジョブが通ったあとに実行するデプロイ用ジョブを追加する形にする。web は api の URL に依存してビルドする制約（[02_Artifact_Registry](infra_design_02_Artifact_Registry.md)）があるため、ジョブの順序は「api のビルド・push・デプロイ」→「web のビルド・push・デプロイ」を維持する。

## 2. カスタムドメイン

初期版は Cloud Run が発行する既定の URL（`*.run.app`）をそのまま使う。家族内利用のみで URL を人に伝える機会がなく、独自ドメインを取得する費用（[6.7 コスト](../01_requirements/00_共通/01_プロダクト共通.md#67-コスト)の「月額費用を最小に保つ」に反する）に見合わないため。

## 3. Supabase バックアップの実測値確認

[00_概要と全体構成 4節](infra_design_00_概要と全体構成.md#4-未決事項の決定)で「無料プランの既定値をそのまま使う」と決めたが、実際の取得頻度・保持期間は [01_事前準備](infra_design_01_事前準備.md)でプロジェクトを作成したあと、Supabase の「Database」→「Backups」画面で確認し、[`docs/todo/notes/`](../../todo/notes/README.md)に実測値を残すこと。
