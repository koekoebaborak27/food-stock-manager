import { redirect } from "next/navigation";
import { getSession, LogoutButton } from "@/modules/auth";

// トップ画面。どの家族グループにも属していなければ選択画面へ振り分ける。
// 常備食一覧は未実装のため、それ以外は今は土台が動くことを確かめるための仮置き。
export default async function Home() {
  const session = await getSession();
  if (!session.household) {
    redirect("/household");
  }

  return (
    <main>
      <h1>おうちde常備食</h1>
      <LogoutButton />
    </main>
  );
}
