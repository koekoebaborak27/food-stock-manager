import { redirect } from "next/navigation";
import { Suspense } from "react";
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
  // StockListPageがURLのurgentOnlyを読む（useSearchParams）ためSuspenseで包む。
  return (
    <Suspense>
      <StockListPage householdName={household.name} />
    </Suspense>
  );
}
