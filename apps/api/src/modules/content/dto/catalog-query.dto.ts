import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CatalogFacetDto, CatalogVideoDto } from './catalog-video.dto';

export class CatalogQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1, maximum: 10000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
  @ApiPropertyOptional({ type: Number, default: 24, minimum: 1, maximum: 48 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit = 24;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(160) q?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(120) id?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  disciplines?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(120) trainer?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  gameAreas?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  positions?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  skillGroups?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  techniques?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  movements?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() @MaxLength(120) drills?: string;
}

export class CatalogPageDto {
  @ApiProperty({ type: [CatalogVideoDto] }) items!: CatalogVideoDto[];
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) limit!: number;
}

export class CatalogFacetsDto {
  @ApiProperty({ type: [CatalogFacetDto] }) disciplines!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) trainer!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) gameAreas!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) positions!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) skillGroups!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) techniques!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) movements!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) drills!: CatalogFacetDto[];
}
