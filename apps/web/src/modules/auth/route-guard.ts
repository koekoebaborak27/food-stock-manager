// ログイン状態とアクセス先から、遷移させるべき先を決める（純粋関数）。
// 実際にログインしているかどうかの確認はバックエンドのAPIが行う。
// ここでのCookieの有無による判定は画面遷移の体験のためのものであり、セキュリティの境界ではない。
const LOGIN_PATH = "/login";
const AFTER_LOGIN_PATH = "/";

export function decideRedirect(hasSessionCookie: boolean, pathname: string): string | null {
  if (pathname === LOGIN_PATH) {
    // ログイン済みでログイン画面へ来た場合はトップへ流す。未ログインならそのまま表示する。
    return hasSessionCookie ? AFTER_LOGIN_PATH : null;
  }
  // ログイン画面以外は、未ログインならログイン画面へ流す。ログイン済みはそのまま表示する。
  return hasSessionCookie ? null : LOGIN_PATH;
}
