import { IsBoolean } from 'class-validator';

export class CheckoutDto {
  @IsBoolean()
  immediateAccessConsent!: boolean;

  @IsBoolean()
  withdrawalAcknowledgement!: boolean;
}
