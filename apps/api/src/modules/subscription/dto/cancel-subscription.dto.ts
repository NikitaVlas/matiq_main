import { Equals, IsBoolean } from 'class-validator';

export class CancelSubscriptionDto {
  @IsBoolean()
  @Equals(true)
  confirmed!: boolean;
}
