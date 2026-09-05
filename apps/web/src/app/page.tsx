import { LogoutButton } from "@/modules/auth";

// トップ画面。今は土台が動くことを確かめるための仮置きで、
// 実際の画面（常備食一覧・家族グループの選択への振り分け）は別途作る。
export default function Home() {
  return (
    <main>
      <h1>おうちde常備食</h1>
      <LogoutButton />
    </main>
  );
}
