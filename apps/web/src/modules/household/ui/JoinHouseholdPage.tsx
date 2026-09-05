import { getSession } from "@/modules/auth";
import { JoinHouseholdForm } from "./JoinHouseholdForm";

// 招待コードで参加する画面の入口。所属状況を取得してフォームへ渡す。
export async function JoinHouseholdPage() {
  const session = await getSession();
  return <JoinHouseholdForm hasHousehold={session.household !== null} />;
}
