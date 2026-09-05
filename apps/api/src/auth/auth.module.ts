import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleStrategy } from "./google.strategy";
import { SessionGuard } from "./session.guard";
import { SessionService } from "./session.service";

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, SessionService, SessionGuard],
  exports: [SessionService, SessionGuard],
})
export class AuthModule {}
