import { Discipline } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AssessmentAnswerDto {
  @ApiProperty()
  @IsString()
  questionKey!: string;

  @ApiProperty()
  @IsString()
  optionKey!: string;
}

export class SubmitAssessmentDto {
  @ApiProperty({ type: [AssessmentAnswerDto] })
  @IsArray()
  answers!: AssessmentAnswerDto[];
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
