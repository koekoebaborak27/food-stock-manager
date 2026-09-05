import "server-only";
import { serverApiFetch } from "@/shared/api/server-fetch";
import type { HouseholdDetail } from "./types";

// 自分の家族グループとメンバー一覧を見る。所属していなければAppError(NO_HOUSEHOLD)を投げる。
export function getMyHousehold(): Promise<HouseholdDetail> {
  return serverApiFetch<HouseholdDetail>("/api/households/me");
}
