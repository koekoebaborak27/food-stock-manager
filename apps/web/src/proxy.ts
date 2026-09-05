import { NextResponse, type NextRequest } from "next/server";
import { decideRedirect } from "@/modules/auth";

// ログイン状態に応じて画面を振り分ける。POST（Server Actionの送信）はここでは対象にしない
// （途中でリダイレクトすると送信先が誘導先へ転送され続けるため。apps/web/AGENTS.md）。
export function proxy(request: NextRequest): NextResponse {
  if (request.method !== "GET") {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.has("session");
  const redirectTo = decideRedirect(hasSessionCookie, request.nextUrl.pathname);
  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};
