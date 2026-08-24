import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Belt, Discipline } from '@prisma/client';

export class SocialLinkDto {
  @ApiProperty() label!: string;
  @ApiProperty({ format: 'uri' }) url!: string;
}

export class SaveTrainerProfileDto {
  @ApiProperty({ pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }) slug!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ format: 'uri' }) photoUrl?: string;
  @ApiProperty() biography!: string;
  @ApiProperty() athleteJourney!: string;
  @ApiProperty({ enum: Discipline, isArray: true }) disciplines!: Discipline[];
  @ApiPropertyOptional({ enum: Belt }) belt?: Belt;
  @ApiProperty({ type: [String] }) qualifications!: string[];
  @ApiProperty({ type: [String] }) achievements!: string[];
  @ApiPropertyOptional() competitionExperience?: string;
  @ApiProperty() trainingPrinciples!: string;
  @ApiProperty() city!: string;
  @ApiProperty({ minLength: 2, maxLength: 2 }) countryCode!: string;
  @ApiProperty({ type: [String] }) languages!: string[];
  @ApiPropertyOptional() localAvailability?: string;
  @ApiProperty({ type: [SocialLinkDto] }) socialLinks!: SocialLinkDto[];
}
