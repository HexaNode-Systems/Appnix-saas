import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsIn,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuperAdminLoginDto {
  @ApiProperty({ example: 'superadmin@appnix.co.in' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SuperAdmin@2026!' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsString()
  @IsOptional()
  mfaCode?: string;
}

export class CreatePartnerDto {
  @ApiProperty({ example: 'Apex Digital Marketing' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'apex-digital' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'admin@apexdigital.com' })
  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @ApiProperty({ example: 'Alex Partner' })
  @IsString()
  @IsNotEmpty()
  adminName: string;

  @ApiPropertyOptional({
    example: 'Partner@Pass123',
    description: 'Initial password for reseller admin. Auto-generated if omitted.',
  })
  @IsString()
  @MinLength(6)
  @IsOptional()
  adminPassword?: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  adminPhone: string;

  @ApiPropertyOptional({
    example: 'email-verified:...',
    description: 'Email verification token from partner email OTP verification',
  })
  @IsString()
  @IsOptional()
  verificationToken?: string;

  @ApiPropertyOptional({
    description: 'Legacy verification token kept for backward compatibility',
  })
  @IsString()
  @IsOptional()
  firebaseIdToken?: string;

  @ApiPropertyOptional({ example: 'ws-plan-starter' })
  @IsString()
  @IsOptional()
  wholesalePlanId?: string;

  @ApiPropertyOptional({ example: 49999.0, description: 'One-time Lifetime White-Label License Fee' })
  @IsNumber()
  @IsOptional()
  setupFee?: number;

  @ApiPropertyOptional({ example: 49999.0, description: 'Alias for setupFee' })
  @IsNumber()
  @IsOptional()
  lifetimeFee?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the one-time lifetime fee is paid' })
  @IsBoolean()
  @IsOptional()
  setupFeePaid?: boolean;

  @ApiPropertyOptional({ example: 'PAID', description: 'Payment status: PAID or PENDING' })
  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 499.0, description: 'Appnix commission per active onboarded client per month' })
  @IsNumber()
  @IsOptional()
  perClientRate?: number;

  @ApiPropertyOptional({ example: 499.0, description: 'Alias for perClientRate' })
  @IsNumber()
  @IsOptional()
  commissionPerClient?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @IsOptional()
  clientLimit?: number;

  @ApiPropertyOptional({ example: 'app.apexdigital.com' })
  @IsString()
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({ example: ['whatsapp', 'instagram', 'rcs', 'crm', 'chatbots'] })
  @IsArray()
  @IsOptional()
  featureAccess?: string[];

  @ApiPropertyOptional({ example: false, description: 'Whether 7-day free trial is enabled for this partner' })
  @IsBoolean()
  @IsOptional()
  trialEnabled?: boolean;

  @ApiPropertyOptional({ example: 7, description: 'Trial duration in days (fixed at 7)' })
  @IsNumber()
  @IsOptional()
  trialDays?: number;

  @ApiPropertyOptional({ example: 5, description: 'Maximum users allowed during free trial' })
  @IsNumber()
  @IsOptional()
  trialMaxUsers?: number;

  @ApiPropertyOptional({ example: '#0f172a' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoUrl?: string;
}

export class UpdatePartnerDto {
  @ApiPropertyOptional({ example: 'Apex Digital Agency' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'apex-agency' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'Alex Partner' })
  @IsString()
  @IsOptional()
  adminName?: string;

  @ApiPropertyOptional({ example: 'admin@apexdigital.com' })
  @IsEmail()
  @IsOptional()
  adminEmail?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  adminPhone?: string;

  @ApiPropertyOptional({ example: 'NewSecret123' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  adminPassword?: string;

  @ApiPropertyOptional({ example: '#2563eb' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  faviconUrl?: string;

  @ApiPropertyOptional({ example: 'ws-plan-growth' })
  @IsString()
  @IsOptional()
  wholesalePlanId?: string;

  @ApiPropertyOptional({ example: 49999, description: 'One-time Lifetime White-Label License Fee' })
  @IsNumber()
  @IsOptional()
  setupFee?: number;

  @ApiPropertyOptional({ example: 49999, description: 'Alias for setupFee' })
  @IsNumber()
  @IsOptional()
  lifetimeFee?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the one-time lifetime fee is paid' })
  @IsBoolean()
  @IsOptional()
  setupFeePaid?: boolean;

  @ApiPropertyOptional({ example: 'PAID', description: 'Payment status: PAID or PENDING' })
  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 399, description: 'Appnix commission per active client per month' })
  @IsNumber()
  @IsOptional()
  perClientRate?: number;

  @ApiPropertyOptional({ example: 399, description: 'Alias for perClientRate' })
  @IsNumber()
  @IsOptional()
  commissionPerClient?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  clientLimit?: number;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  featureAccess?: string[];

  @ApiPropertyOptional({ example: false, description: 'Whether 7-day free trial is enabled for this partner' })
  @IsBoolean()
  @IsOptional()
  trialEnabled?: boolean;

  @ApiPropertyOptional({ example: 7, description: 'Trial duration in days (fixed at 7)' })
  @IsNumber()
  @IsOptional()
  trialDays?: number;

  @ApiPropertyOptional({ example: 5, description: 'Maximum users allowed during free trial' })
  @IsNumber()
  @IsOptional()
  trialMaxUsers?: number;

  @ApiPropertyOptional({ example: 'app.apexdigital.com' })
  @IsString()
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'CANCELLED'] })
  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'CANCELLED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
}

export class UpdatePartnerStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'CANCELLED'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'SUSPENDED', 'CANCELLED'])
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

  @ApiPropertyOptional({ example: 'Terms violation or voluntary freeze' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreateWholesalePlanDto {
  @ApiProperty({ example: 'Agency Pro Wholesale' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'agency-pro-wholesale' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'Wholesale tier for mid-size digital marketing agencies.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 19999 })
  @IsNumber()
  @Min(0)
  setupFee: number;

  @ApiProperty({ example: 349 })
  @IsNumber()
  @Min(0)
  perClientPrice: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'monthly' })
  @IsString()
  @IsOptional()
  billingCycle?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  maxClients?: number;

  @ApiPropertyOptional({ example: ['whatsapp', 'instagram', 'rcs', 'chatbots'] })
  @IsArray()
  @IsOptional()
  featureAccess?: string[];

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateWholesalePlanDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  setupFee?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  perClientPrice?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  billingCycle?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxClients?: number;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  featureAccess?: string[];

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'] })
  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateDomainDto {
  @ApiProperty({ example: 'partner-tenant-uuid' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: 'portal.partneragency.com' })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiPropertyOptional({ example: 'CNAME' })
  @IsString()
  @IsOptional()
  dnsRecordType?: string;
}

export class VerifyDomainDto {
  @ApiProperty({ example: 'domain-mapping-uuid' })
  @IsString()
  @IsNotEmpty()
  domainId: string;
}

export class UpdateClientStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'CANCELLED'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'SUSPENDED', 'CANCELLED'])
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreateFeatureDto {
  @ApiProperty({ example: 'voice_ai' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Voice AI Agent' })
  @IsString()
  @IsNotEmpty()
  label: string;
}

