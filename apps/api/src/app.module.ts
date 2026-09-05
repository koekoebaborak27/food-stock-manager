import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { HouseholdModule } from "./household/household.module";
import { PrismaModule } from "./prisma/prisma.module";

// アプリ全体の入れ物。機能を足すときは、ここに機能ごとの入れ物を登録していく。
@Module({
  imports: [PrismaModule, AuthModule, HouseholdModule],
  controllers: [AppController],
})
export class AppModule {}
