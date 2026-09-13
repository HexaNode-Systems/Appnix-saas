import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'Scale Pro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'scale-pro' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 49 })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 49 })
  @IsNumber()
  @IsOptional()
  monthlyPrice?: number;

  @ApiPropertyOptional({ example: 490 })
  @IsNumber()
  @IsOptional()
  yearlyPrice?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  userLimit?: number | string;

  @ApiPropertyOptional({ example: '100,000 req/mo' })
  @IsString()
  @IsOptional()
  apiLimit?: string;

  @ApiPropertyOptional({ example: '10 GB' })
  @IsString()
  @IsOptional()
  storageLimit?: string;

  @ApiPropertyOptional({ example: '12h Support Response' })
  @IsString()
  @IsOptional()
  supportSla?: string;

  @ApiPropertyOptional({ example: ['10 Users Allowed', '100,000 req/mo'] })
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  customDomain?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  sso?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  advancedAnalytics?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  prioritySupport?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  trialDays?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ example: 'scale-pro' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  trialDays?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  monthlyPrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  yearlyPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  userLimit?: number | string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  apiLimit?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storageLimit?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supportSla?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPopular?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  customDomain?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  sso?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  advancedAnalytics?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  prioritySupport?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}
