import { ApiProperty } from '@nestjs/swagger';

export class RoadmapTopicDto {
  @ApiProperty({ type: String, maxLength: 100, pattern: '^[a-z0-9-]+$' })
  key!: string;

  @ApiProperty({ type: String, maxLength: 120 })
  name!: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  parentId?: string | null;
}

export class RoadmapTopicLinkDto {
  @ApiProperty({ nullable: true, type: String })
  parentId!: string | null;
}
