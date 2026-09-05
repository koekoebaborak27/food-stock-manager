import { randomUUID } from "node:crypto";
import type { PrismaService } from "../prisma/prisma.service";
import type { Household, User } from "@prisma/client";

// DB統合テスト専用のデータ作成ヘルパー（TESTING.md 7.2）。
// household配下の複数のテストファイルから使うため、テストの近くにまとめて置く。

export function createUser(
  prisma: PrismaService,
  overrides: { displayName?: string } = {},
): Promise<User> {
  return prisma.user.create({
    data: {
      googleId: `test-google-${randomUUID()}`,
      displayName: overrides.displayName ?? "テスト太郎",
      email: `${randomUUID()}@example.com`,
      avatarUrl: null,
    },
  });
}

export async function createHouseholdWithAdmin(
  prisma: PrismaService,
  adminUserId: string,
  name = "テスト家族",
): Promise<Household> {
  const household = await prisma.household.create({ data: { name } });
  await prisma.membership.create({
    data: { userId: adminUserId, householdId: household.id, role: "ADMIN" },
  });
  return household;
}

export function addMember(
  prisma: PrismaService,
  userId: string,
  householdId: string,
  role: "ADMIN" | "MEMBER" = "MEMBER",
) {
  return prisma.membership.create({ data: { userId, householdId, role } });
}

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.household.deleteMany({});
  await prisma.user.deleteMany({});
}
