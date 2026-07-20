import { AthleteGoal, Belt, Discipline } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class SaveAthleteProfileDto {
  @ApiProperty({ enum: Discipline, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Discipline, { each: true })
  disciplines!: Discipline[];

  @ApiPropertyOptional({ enum: Belt })
  @IsOptional()
  @IsEnum(Belt)
  belt?: Belt;

  @ApiProperty({ minimum: 0, maximum: 80 })
  @IsInt()
  @Min(0)
  @Max(80)
  experienceYears!: number;

  @ApiProperty({ minimum: 1, maximum: 14 })
  @IsInt()
  @Min(1)
  @Max(14)
  trainingSessionsPerWeek!: number;

  @ApiProperty()
  @IsBoolean()
  competitionExperience!: boolean;

  @ApiProperty({ enum: AthleteGoal, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(AthleteGoal, { each: true })
  goals!: AthleteGoal[];
}
