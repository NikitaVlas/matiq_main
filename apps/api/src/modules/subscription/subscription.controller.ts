import { Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard, AuthenticatedRequest } from '../identity/auth.guard';
import { SubscriptionService } from '../subscription/subscription.service';

@ApiTags('subscription')
@Controller('subscription')
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(@Inject(SubscriptionService) private readonly subscriptions: SubscriptionService) {}
  @Get() current(@Req() req: AuthenticatedRequest) {
    return this.subscriptions.current(req.userId);
  }
  @Post('activate-trial') trial(@Req() req: AuthenticatedRequest) {
    return this.subscriptions.startTrial(req.userId);
  }
  @Post('activate') activate(@Req() req: AuthenticatedRequest) {
    return this.subscriptions.activate(req.userId);
  }
  @Post('cancel') cancel(@Req() req: AuthenticatedRequest) {
    return this.subscriptions.cancel(req.userId);
  }
}
