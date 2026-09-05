export interface HouseholdMember {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "MEMBER";
}

// GET /api/households/me の応答（apps/api/src/household/household.service.ts の HouseholdDetail と対応）。
export interface HouseholdDetail {
  id: string;
  name: string;
  members: HouseholdMember[];
}

// POST /api/invitations の応答。
export interface InvitationView {
  code: string;
  expiresAt: string;
}

// Server Actionの結果。画面はcodeで特別な表示（確認ダイアログの出し分け等）を、
// messageで帯・入力欄下の文言を決める。
export type ActionResult = { ok: true } | { ok: false; code: string; message: string };

// 招待コードの発行・再表示だけは、成功時にコード本体を画面へ返す必要がある。
export type IssueInvitationResult =
  { ok: true; invitation: InvitationView } | { ok: false; code: string; message: string };
