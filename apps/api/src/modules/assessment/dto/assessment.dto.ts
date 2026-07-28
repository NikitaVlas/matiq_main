import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
