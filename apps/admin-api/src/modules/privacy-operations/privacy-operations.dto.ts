import { ApiProperty } from '@nestjs/swagger';

export class PrivacyOperationsStatusDto {
  @ApiProperty({ type: Number, minimum: 0 }) scheduled!: number;
  @ApiProperty({ type: Number, minimum: 0 }) dueSchedules!: number;
  @ApiProperty({ type: Number, minimum: 0 }) pendingDeletion!: number;
  @ApiProperty({ type: Number, minimum: 0 }) pendingOutbox!: number;
  @ApiProperty({ type: Number, minimum: 0 }) staleProcessing!: number;
  @ApiProperty({ type: Number, minimum: 0 }) failedInbox!: number;
  @ApiProperty({ type: Number, minimum: 0 }) privacyDeadLetters!: number;
  @ApiProperty({ type: Number, minimum: 0 }) renewalPending!: number;
  @ApiProperty({ type: Number, minimum: 0 }) renewalReviewRequired!: number;
  @ApiProperty({ type: Number, minimum: 0 }) oldestPendingSeconds!: number;
}

export class RetryPrivacyOperationsDto {
  @ApiProperty({ enum: ['RETRY'] }) confirmation!: 'RETRY';
}

export class RetryPrivacyOperationsResultDto {
  @ApiProperty({ type: Number, minimum: 0 }) pendingReleased!: number;
  @ApiProperty({ type: Number, minimum: 0 }) deadLettersRequeued!: number;
  @ApiProperty({ type: () => PrivacyOperationsStatusDto }) status!: PrivacyOperationsStatusDto;
}
