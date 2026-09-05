import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

// どのモジュールからもDBへ触れるよう、アプリ全体で1つだけ用意する。
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
