import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBotDto {
  @ApiProperty({ example: 'Lead Qualification Bot' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'INBOUND_MESSAGE' })
  @IsString()
  @IsOptional()
  triggerType?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  nodes?: any;

  @ApiPropertyOptional()
  @IsOptional()
  edges?: any;

  @ApiPropertyOptional()
  @IsOptional()
  workflow?: any;

  @ApiPropertyOptional()
  @IsOptional()
  trigger?: any;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: any;

  @ApiPropertyOptional({ example: ['whatsapp'] })
  @IsArray()
  @IsOptional()
  channels?: string[];

  @ApiPropertyOptional({ example: ['Support', 'AI'] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  folderId?: string;
}

export class UpdateBotDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  triggerType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  nodes?: any;

  @ApiPropertyOptional()
  @IsOptional()
  edges?: any;

  @ApiPropertyOptional()
  @IsOptional()
  workflow?: any;

  @ApiPropertyOptional()
  @IsOptional()
  trigger?: any;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: any;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  channels?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  currentVersion?: number;
}
