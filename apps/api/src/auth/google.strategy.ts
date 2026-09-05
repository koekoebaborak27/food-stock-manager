import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type Profile, type VerifyCallback } from "passport-google-oauth20";

export interface GoogleProfile {
  googleId: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

// GoogleとのOAuth2ハンドシェイクだけを担う。DBへの反映はauth.controller/auth.serviceで行う。
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? "",
      scope: ["profile", "email"],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      displayName: profile.displayName || null,
      email: profile.emails?.[0]?.value ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, googleProfile);
  }
}
