import { Discipline } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ArrayUnique,
  IsBoolean,
  IsIn,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AssessmentAnswerDto {
  @ApiProperty()
  @IsString()
  questionKey!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  optionKey?: string;

  @ApiProperty({ required: false, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customText?: string;
}

export class SubmitAssessmentDto {
  @ApiProperty({ type: [AssessmentAnswerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AssessmentAnswerDto)
  answers!: AssessmentAnswerDto[];
}

export class AssessmentDraftDto extends SubmitAssessmentDto {
  @ApiProperty({ enum: Discipline })
  @IsEnum(Discipline)
  discipline!: Discipline;
}

export class RoadmapItemDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ enum: Discipline, required: false })
  @IsOptional()
  @IsEnum(Discipline)
  discipline?: Discipline;

  @ApiProperty({ required: false })
  @IsString()
  skillKey?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @Max(100)
  position?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lessonId?: string;
}

export class UpdateRoadmapItemDto {
  @ApiProperty({ required: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiProperty({ required: false, type: String, enum: ['up', 'down'] })
  @IsOptional()
  @IsIn(['up', 'down'])
  direction?: 'up' | 'down';

  @ApiProperty({ required: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiProperty({ required: false, type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  selectedSkillKeys?: string[];
}
