import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { GoogleProfile } from "./google.strategy";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  // Googleアカウントで利用者を登録・更新する。
  // googleIdで探すため、退会等で空になった行も同じ利用者として見つけ、値を入れ直す
  // （docs/specs/02_basic-design/10_認証と家族グループ/01_データベース.md 1節）。
  async loginWithGoogle(profile: GoogleProfile): Promise<string> {
    const user = await this.prisma.user.upsert({
      where: { googleId: profile.googleId },
      update: {
        displayName: profile.displayName,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      },
      create: {
        googleId: profile.googleId,
        displayName: profile.displayName,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      },
    });
    return user.id;
  }

  async getProfile(
    userId: string,
  ): Promise<{ displayName: string | null; avatarUrl: string | null }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { displayName: user.displayName, avatarUrl: user.avatarUrl };
  }
}
