// ログイン画面。アプリ名・説明・「Googleでログインする」だけを持つ
// （docs/specs/02_basic-design/10_認証と家族グループ/10_ログイン.md）。
// 通常のリンク遷移でバックエンドの認可入口へ移す（fetchではなく<a>にする）。
export function LoginPage() {
  return (
    <main>
      <h1>おうちde常備食</h1>
      <p>家族で作り置きと食品ストックを共有します。</p>
      <a href="/api/auth/google">Googleでログインする</a>
    </main>
  );
}
