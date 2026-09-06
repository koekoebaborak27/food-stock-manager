import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth";
import { getMyHousehold } from "@/modules/household";
import { ShoppingListPage } from "@/modules/shopping-item";

// 買い物リスト画面。下部タブから開く3画面の1つのため、常備食リストと同様に
// 家族グループへ未所属なら選択画面へ振り分ける。
export default async function ShoppingListRoute() {
  const session = await getSession();
  if (!session.household) {
    redirect("/household");
  }

  const household = await getMyHousehold();
  return <ShoppingListPage householdName={household.name} />;
}
