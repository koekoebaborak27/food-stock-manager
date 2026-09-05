import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth";
import { getMyHousehold } from "@/modules/household";
import { StockListPage } from "@/modules/stock";

// トップ画面。どの家族グループにも属していなければ選択画面へ振り分ける。
// 所属している利用者には、アプリの入口となる常備食リストを表示する。
export default async function Home() {
  const session = await getSession();
  if (!session.household) {
    redirect("/household");
  }

  const household = await getMyHousehold();
  return <StockListPage householdName={household.name} />;
}
