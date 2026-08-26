import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTrainerAgreementDto {
  @ApiProperty() trainerId!: string;
  @ApiProperty({ format: 'date-time' }) validFrom!: string;
  @ApiPropertyOptional({ format: 'date-time' }) validUntil?: string;
  @ApiProperty() participatesInPool!: boolean;
  @ApiProperty({ minimum: 0 }) fixedFeeCents!: number;
  @ApiPropertyOptional({ maxLength: 4000 }) specialTerms?: string;
  @ApiPropertyOptional() supersedesAgreementId?: string;
  @ApiPropertyOptional() documentStorageKey?: string;
  @ApiPropertyOptional({ pattern: '^[a-f0-9]{64}$' }) documentChecksumSha256?: string;
  @ApiPropertyOptional() documentFileName?: string;
}

export class CreateSettlementPeriodDto {
  @ApiProperty({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }) month!: string;
  @ApiProperty({ minimum: 0 }) grossRevenueCents!: number;
  @ApiProperty({ minimum: 0 }) vatCents!: number;
  @ApiProperty({ minimum: 0 }) refundsCents!: number;
  @ApiProperty({ minimum: 0 }) chargebacksCents!: number;
  @ApiProperty({ minimum: 0 }) providerFeesCents!: number;
}

export class ReportTransitionDto {
  @ApiProperty({ enum: ['REVIEWED', 'APPROVED', 'PAID', 'VOID'] })
  status!: 'REVIEWED' | 'APPROVED' | 'PAID' | 'VOID';
  @ApiPropertyOptional({ maxLength: 500 }) reason?: string;
  @ApiPropertyOptional({ maxLength: 200 }) externalPaymentReference?: string;
}

export class AdjustReportDto {
  @ApiProperty() adjustmentCents!: number;
  @ApiProperty({ minLength: 1, maxLength: 500 }) reason!: string;
}
