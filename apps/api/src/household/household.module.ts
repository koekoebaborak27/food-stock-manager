import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { HouseholdController } from "./household.controller";
import { HouseholdService } from "./household.service";
import { InvitationController } from "./invitation.controller";
import { InvitationService } from "./invitation.service";

@Module({
  imports: [AuthModule],
  controllers: [HouseholdController, InvitationController],
  providers: [HouseholdService, InvitationService],
})
export class HouseholdModule {}
