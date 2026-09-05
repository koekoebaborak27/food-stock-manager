// GET /api/auth/session の応答（apps/api/src/auth/auth.controller.ts の SessionResponse と対応）。
export interface SessionInfo {
  userId: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  household: { id: string; role: "ADMIN" | "MEMBER" } | null;
}
