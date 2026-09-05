import { Controller, Get } from "@nestjs/common";

// サーバーが起きているかを確かめるための、動作確認用の窓口。
@Controller()
export class AppController {
  // GET / に応答して、状態を表す文字列を返す。
  @Get()
  getHealth(): { status: string } {
    return { status: "ok" };
  }
}
