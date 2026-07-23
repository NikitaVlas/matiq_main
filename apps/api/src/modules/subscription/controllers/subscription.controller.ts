import { Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard, AuthenticatedRequest } from '../../identity/infrastructure/auth.guard';
import { SubscriptionService } from '../application/subscription.service';
import { CheckoutDto } from '../dto/checkout.dto';
import { CancelSubscriptionDto } from '../dto/cancel-subscription.dto';
import { Body } from '@nestjs/common';

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
  @Post('checkout') checkout(@Req() req: AuthenticatedRequest, @Body() dto: CheckoutDto) {
    return this.subscriptions.checkout(
      req.userId,
      dto.immediateAccessConsent,
      dto.withdrawalAcknowledgement,
    );
  }
  @Post('cancel') cancel(@Req() req: AuthenticatedRequest, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptions.cancel(req.userId, dto.confirmed);
  }
  @Post('resume') resume(@Req() req: AuthenticatedRequest) {
    return this.subscriptions.resume(req.userId);
  }
  @Post('billing-portal') billingPortal(@Req() req: AuthenticatedRequest) {
    return this.subscriptions.billingPortal(req.userId);
  }
  @Post('payment-update-portal') paymentUpdatePortal(@Req() req: AuthenticatedRequest) {
    return this.subscriptions.paymentUpdatePortal(req.userId);
  }
}
