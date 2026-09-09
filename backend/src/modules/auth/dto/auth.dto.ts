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

  @ApiProperty({
    description: 'Google reCAPTCHA v3 response token',
    required: false,
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}

export class AdminLoginDto extends LoginDto {
  @ApiPropertyOptional({
    description: 'Optional reseller workspace slug for tenant identification',
    example: 'acme-agency',
  })
  @IsOptional()
  @IsString()
  orgSlug?: string;

  @ApiPropertyOptional({
    description: 'Two-factor authenticator code (TOTP)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  mfaCode?: string;
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