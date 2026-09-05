"use client";

// ログアウトボタン。押すとセッションを失効させ、ログイン画面へ戻る。
export function LogoutButton() {
  async function handleClick(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return <button onClick={() => void handleClick()}>ログアウト</button>;
}
