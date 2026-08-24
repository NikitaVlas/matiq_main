import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class PlaybackHeartbeatDto {
  @ApiProperty()
  @IsString()
  @Length(20, 256)
  playbackToken!: string;

  @ApiProperty()
  @IsString()
  @Length(8, 128)
  idempotencyKey!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  sequence!: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  previousPositionSec!: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  currentPositionSec!: number;

  @ApiProperty({ minimum: 0, maximum: 60000 })
  @IsInt()
  @Min(0)
  @Max(60000)
  activePlaybackMs!: number;

  @ApiProperty({ minimum: 0.25, maximum: 2 })
  @IsNumber()
  @Min(0.25)
  @Max(2)
  playbackRate!: number;

  @ApiProperty()
  @IsBoolean()
  visible!: boolean;

  @ApiProperty()
  @IsBoolean()
  active!: boolean;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  clientAt!: string;
}
