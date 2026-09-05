"use client";

// ログアウトボタン。押すとセッションを失効させ、ログイン画面へ戻る。
export function LogoutButton() {
  async function handleClick(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      className="h-11 w-full rounded-full border border-input bg-background px-4 text-sm font-medium"
      onClick={() => void handleClick()}
    >
      ログアウト
    </button>
  );
}
