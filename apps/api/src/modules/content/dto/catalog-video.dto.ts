import { ApiProperty } from '@nestjs/swagger';

export class CatalogFacetDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) name!: string;
}
export class CatalogTrainerDto {
  @ApiProperty({ type: String }) slug!: string;
  @ApiProperty({ type: String }) displayName!: string;
}
export class CatalogVideoDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: Number, nullable: true }) durationSec!: number | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: [String], enum: ['BJJ_GI', 'NO_GI_GRAPPLING'] }) disciplines!: string[];
  @ApiProperty({ type: CatalogTrainerDto, nullable: true }) trainer!: CatalogTrainerDto | null;
  @ApiProperty({ type: [CatalogFacetDto] }) gameAreas!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) positions!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) skillGroups!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) techniques!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) movements!: CatalogFacetDto[];
  @ApiProperty({ type: [CatalogFacetDto] }) drills!: CatalogFacetDto[];
}
