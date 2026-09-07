import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsObject, ValidateNested, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ChannelType {
  WHATSAPP = 'WHATSAPP',
  INSTAGRAM = 'INSTAGRAM',
  RCS = 'RCS',
  FACEBOOK = 'FACEBOOK',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  READY_FOR_TEST = 'READY_FOR_TEST',
  TEST_SENT = 'TEST_SENT',
  SCHEDULED = 'SCHEDULED',
  LAUNCHING = 'LAUNCHING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum LaunchMode {
  IMMEDIATE = 'IMMEDIATE',
  SCHEDULED = 'SCHEDULED',
}

export enum TestStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum TemplateCategory {
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum TemplateStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  PAUSED = 'PAUSED',
}

export enum AudienceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Festival Season VIP Discount 25%' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Campaign for VIP customers during festival season' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ example: 'Updated campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ChannelType, example: ChannelType.WHATSAPP })
  @IsOptional()
  @IsEnum(ChannelType)
  channel?: ChannelType;

  @ApiPropertyOptional({ example: 'audience-uuid' })
  @IsOptional()
  @IsString()
  audienceId?: string;

  @ApiPropertyOptional({ example: 'VIP Customers' })
  @IsOptional()
  @IsString()
  audienceName?: string;

  @ApiPropertyOptional({ example: 1240 })
  @IsOptional()
  @IsNumber()
  audienceCount?: number;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  audienceSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'template-uuid' })
  @IsOptional()
  @IsString()
  metaTemplateId?: string;

  @ApiPropertyOptional({ example: 'festival_discount_25' })
  @IsOptional()
  @IsString()
  metaTemplateName?: string;

  @ApiPropertyOptional({ example: 'en_US' })
  @IsOptional()
  @IsString()
  metaTemplateLanguage?: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  templateVariables?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  variableMappings?: Record<string, string>;

  @ApiPropertyOptional({ enum: LaunchMode, example: LaunchMode.IMMEDIATE })
  @IsOptional()
  @IsEnum(LaunchMode)
  launchMode?: LaunchMode;

  @ApiPropertyOptional({ example: '2026-08-25T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class SelectAudienceDto {
  @ApiProperty({ example: 'audience-uuid' })
  @IsString()
  audienceId: string;
}

export class SelectChannelDto {
  @ApiProperty({ enum: ChannelType, example: ChannelType.WHATSAPP })
  @IsEnum(ChannelType)
  channel: ChannelType;
}

export class SelectTemplateDto {
  @ApiProperty({ example: 'template-uuid' })
  @IsString()
  templateId: string;
}

export class VariableMappingDto {
  @ApiProperty({ example: '{{1}}' })
  @IsString()
  templateVariable: string;

  @ApiProperty({ example: 'customerName' })
  @IsString()
  dataSource: string;
}

export class ConfigureTemplateDto {
  @ApiProperty({ type: [VariableMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableMappingDto)
  mappings: VariableMappingDto[];
}

export class SendTestDto {
  @ApiProperty({ example: '+1234567890' })
  @IsString()
  testPhoneNumber: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  testContactName?: string;
}

export class LaunchCampaignDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  confirmed: boolean;

  @ApiPropertyOptional({ enum: LaunchMode, example: LaunchMode.IMMEDIATE })
  @IsOptional()
  @IsEnum(LaunchMode)
  launchMode?: LaunchMode;

  @ApiPropertyOptional({ example: '2026-08-25T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class ValidateCampaignDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  skipTestCheck: boolean;
}

export class CampaignResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  audienceId?: string;

  @ApiPropertyOptional()
  audienceName?: string;

  @ApiProperty()
  audienceCount: number;

  @ApiPropertyOptional()
  audienceSnapshot?: Record<string, unknown>;

  @ApiProperty({ enum: ChannelType })
  channel: ChannelType;

  @ApiPropertyOptional()
  metaTemplateId?: string;

  @ApiPropertyOptional()
  metaTemplateName?: string;

  @ApiPropertyOptional()
  metaTemplateLanguage?: string;

  @ApiPropertyOptional()
  templateVariables?: Array<Record<string, unknown>>;

  @ApiPropertyOptional()
  variableMappings?: Record<string, string>;

  @ApiProperty({ enum: CampaignStatus })
  status: CampaignStatus;

  @ApiProperty({ enum: LaunchMode })
  launchMode: LaunchMode;

  @ApiPropertyOptional()
  scheduledAt?: Date;

  @ApiPropertyOptional()
  testSentAt?: Date;

  @ApiPropertyOptional()
  testRecipient?: string;

  @ApiPropertyOptional({ enum: TestStatus })
  testStatus?: TestStatus;

  @ApiPropertyOptional()
  testMessageId?: string;

  @ApiPropertyOptional()
  launchedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  createdBy: string;

  @ApiPropertyOptional()
  sentCount?: number;

  @ApiPropertyOptional()
  deliveryRate?: string;

  @ApiPropertyOptional()
  openRate?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AudienceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  contactCount: number;

  @ApiProperty({ enum: AudienceStatus })
  status: AudienceStatus;

  @ApiProperty()
  lastUpdated: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ChannelConfigResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ enum: ChannelType })
  channel: ChannelType;

  @ApiProperty()
  isConnected: boolean;

  @ApiPropertyOptional()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  connectedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MetaTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  metaTemplateId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: TemplateCategory })
  category: TemplateCategory;

  @ApiProperty()
  language: string;

  @ApiProperty({ enum: TemplateStatus })
  status: TemplateStatus;

  @ApiProperty()
  components: Array<Record<string, unknown>>;

  @ApiPropertyOptional()
  preview?: string;

  @ApiProperty()
  lastSyncedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ type: [Object] })
  data: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}