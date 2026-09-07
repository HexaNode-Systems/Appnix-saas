import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantTier } from '@prisma/client';

export class CreateTenantDto {
  @ApiProperty({ description: 'Organization or tenant display name', example: 'Acme Reseller Corp' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'URL-friendly slug (auto-generated if omitted)', example: 'acme-reseller' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ enum: TenantTier, description: 'Tier in the B2B2X hierarchy', default: TenantTier.END_CLIENT })
  @IsEnum(TenantTier)
  @IsOptional()
  tier?: TenantTier;

  @ApiPropertyOptional({ description: 'Parent organization ID for hierarchical chaining' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Custom domain hostname (e.g. portal.acmecorp.com)' })
  @IsString()
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({ description: 'Primary brand accent color (HEX format)', default: '#0f172a' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Brand logo URL' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Favicon URL' })
  @IsString()
  @IsOptional()
  faviconUrl?: string;

  @ApiPropertyOptional({ description: 'Maximum downstream sub-resellers allowed', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxSubResellers?: number;

  @ApiPropertyOptional({ description: 'Maximum downstream leaf clients allowed', default: 10 })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxEndClients?: number;

  @ApiPropertyOptional({ description: 'Admin email for the new organization' })
  @IsString()
  @IsOptional()
  adminEmail?: string;

  @ApiPropertyOptional({ description: 'Admin initial password for the new organization' })
  @IsString()
  @IsOptional()
  adminPassword?: string;
}

export class UpdateTenantBrandingDto {
  @ApiPropertyOptional({ description: 'Custom domain hostname' })
  @IsString()
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({ description: 'Brand primary color' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Brand logo URL' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Favicon URL' })
  @IsString()
  @IsOptional()
  faviconUrl?: string;

  @ApiPropertyOptional({ description: 'Organization display name' })
  @IsString()
  @IsOptional()
  name?: string;
}
