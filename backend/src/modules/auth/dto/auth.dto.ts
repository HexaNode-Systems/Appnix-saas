import { IsEmail, IsString, MinLength, IsOptional, IsEnum, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Shared Enum ────────────────────────────────────────────────────────────

export enum OtpType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  TWO_FACTOR = '2fa',
}

// ─── Auth DTOs ──────────────────────────────────────────────────────────────

export class SignupDto {
  @ApiProperty({
    description: 'Name of the workspace/tenant to create',
    example: 'Acme Inc',
    minLength: 2,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  workspaceName?: string;

  @ApiProperty({
    description: 'Name of the tenant to create (alias for workspaceName)',
    example: 'Acme Inc',
    minLength: 2,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  tenantName?: string;

  @ApiProperty({
    description: 'Admin email for the tenant',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Account password. Minimum 8 characters.',
    example: 'StrongPass123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Confirm password (optional validation on signup)',
    required: false,
  })
  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @ApiProperty({
    description: 'Display name of the tenant admin',
    example: 'Alice',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Full name alias for display name',
    example: 'Alice Smith',
    required: false,
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    description: 'Whether terms were accepted',
    required: false,
  })
  @IsOptional()
  termsAccepted?: boolean;

  @ApiProperty({
    description: 'Google reCAPTCHA v3 response token',
    required: false,
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'User email used to sign in',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'StrongPass123',
  })
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: 'Google reCAPTCHA v3 response token',
    required: false,
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;

  @ApiPropertyOptional({
    description: 'Optional reseller/tenant workspace slug for tenant identification',
    example: 'acme-agency',
    required: false,
  })
  @IsOptional()
  @IsString()
  orgSlug?: string;

  @ApiPropertyOptional({
    description: 'Two-factor authenticator code (TOTP)',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  mfaCode?: string;

  @ApiPropertyOptional({
    description: 'Optional flag to remember session',
    example: true,
    required: false,
  })
  @IsOptional()
  rememberMe?: boolean;
}

export class AdminLoginDto extends LoginDto {}

export class SessionLoginDto {
  @ApiPropertyOptional({
    description: 'Impersonation or delegated inspection JWT token to activate session',
    example: 'eyJhbGciOi...',
    required: false,
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    description: 'Alias for token',
    example: 'eyJhbGciOi...',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionToken?: string;

  @ApiPropertyOptional({
    description: 'Alias for impersonation token',
    example: 'eyJhbGciOi...',
    required: false,
  })
  @IsOptional()
  @IsString()
  impersonationToken?: string;

  @ApiPropertyOptional({
    description: 'Target tenant / workspace ID for direct guest-login / inspect initiation',
    example: '11111111-1111-1111-1111-111111111111',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetTenantId?: string;

  @ApiPropertyOptional({
    description: 'Alias for target workspace ID',
    example: '11111111-1111-1111-1111-111111111111',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Alias for partner workspace inspection',
    example: '11111111-1111-1111-1111-111111111111',
    required: false,
  })
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiPropertyOptional({
    description: 'Target user ID if impersonating specific user',
    example: '22222222-2222-2222-2222-222222222222',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiPropertyOptional({
    description: 'Audit purpose or reason for the guest/inspection session',
    example: 'Support inspection & diagnostics',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Optional client name for synthetic fallback',
    example: 'Acme Corp',
    required: false,
  })
  @IsOptional()
  @IsString()
  clientName?: string;
}

// ─── Password Reset DTOs ────────────────────────────────────────────────────

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send the password-reset OTP to',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Google reCAPTCHA v3 response token',
    required: false,
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email address of the account',
    example: 'admin@acme.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'The 6-digit OTP received via email',
    example: '482901',
  })
  @IsString()
  @Length(6, 6, { message: 'Token must be a 6-digit code' })
  token: string;

  @ApiProperty({
    description: 'New password. Minimum 8 characters.',
    example: 'NewStrongPass456',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Confirm the new password — must match password',
    example: 'NewStrongPass456',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  confirmPassword: string;

  @ApiProperty({
    description: 'Google reCAPTCHA v3 response token',
    required: false,
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}

// ─── OTP DTOs ───────────────────────────────────────────────────────────────

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Email the OTP was sent to',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '482901',
  })
  @IsString()
  @Length(6, 6, { message: 'OTP must be a 6-digit code' })
  otp: string;

  @ApiProperty({
    description: 'Purpose of the OTP',
    enum: OtpType,
    example: OtpType.PASSWORD_RESET,
  })
  @IsEnum(OtpType)
  type: OtpType;
}

export class ResendOtpDto {
  @ApiProperty({
    description: 'Email to resend the OTP to',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Purpose of the OTP',
    enum: OtpType,
    example: OtpType.PASSWORD_RESET,
  })
  @IsEnum(OtpType)
  type: OtpType;
}

// ─── OAuth DTOs ─────────────────────────────────────────────────────────────

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Google ID Token / Credential string obtained from Google Sign-In',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString()
  idToken: string;
}