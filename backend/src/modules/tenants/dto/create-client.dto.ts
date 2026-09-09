import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ description: 'Client organization or business name', example: 'Apex Global Corp' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Owner or primary contact person name', example: 'Robert Smith' })
  @IsString()
  @IsOptional()
  ownerName?: string;

  @ApiProperty({ description: 'Administrator work email', example: 'admin@apexcorp.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Contact phone number', example: '+91 9876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Subscription plan tier', example: 'Pro', default: 'Pro' })
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiPropertyOptional({ description: 'Client account status', example: 'ACTIVE', default: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Initial wallet balance in INR', example: 1000, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  walletBalance?: number;

  @ApiPropertyOptional({ description: 'Custom workspace slug' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Initial admin temporary password' })
  @IsString()
  @IsOptional()
  adminPassword?: string;

  @ApiPropertyOptional({ description: 'WhatsApp BSP connection status', default: 'Connected' })
  @IsString()
  @IsOptional()
  whatsappStatus?: string;

  @ApiPropertyOptional({ description: 'Optional partner ID if provisioned by Super Admin' })
  @IsString()
  @IsOptional()
  partnerId?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional({ description: 'Client organization or business name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Owner or primary contact person name' })
  @IsString()
  @IsOptional()
  ownerName?: string;

  @ApiPropertyOptional({ description: 'Administrator work email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Subscription plan tier' })
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiPropertyOptional({ description: 'Client account status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Wallet balance in INR' })
  @IsNumber()
  @IsOptional()
  walletBalance?: number;
}
