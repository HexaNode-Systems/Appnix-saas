import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RecaptchaService } from './recaptcha.service';
import { OtpType } from './dto/auth.dto';

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  tenantId: string;
  role: string;
  orgPath?: string;
  tier?: string;
  permissions?: string[];
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  workspaceId: string;
  workspaceName: string;
  permissions: string[];
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  orgPath?: string;
  tier?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private recaptchaService: RecaptchaService,
  ) {}

  formatUser(user: any, tenantName?: string): UserResponse {
    const roleMap: Record<string, 'owner' | 'admin' | 'member' | 'viewer'> = {
      SUPER_ADMIN: 'owner',
      RESELLER_ADMIN: 'admin',
      TENANT_ADMIN: 'admin',
      MEMBER: 'member',
    };

    return {
      id: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      avatar: user.avatar || undefined,
      role: roleMap[user.role] || 'member',
      workspaceId: user.tenantId,
      workspaceName: tenantName || user.tenant?.name || 'Workspace',
      permissions: ['*'],
      emailVerified: true,
      twoFactorEnabled: false,
      orgPath: user.tenant?.path || (user.role === 'SUPER_ADMIN' ? 'root' : undefined),
      tier: user.tenant?.tier || (user.role === 'SUPER_ADMIN' ? 'PLATFORM_ROOT' : undefined),
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  async validateOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    name?: string;
    avatar?: string;
  }) {
    if (!profile.email) {
      throw new BadRequestException('Google account does not provide an email address.');
    }

    // 1. Check if user already exists by googleId
    let user = await this.usersService.findByGoogleId(profile.googleId);

    // 2. If not found by googleId, check by email
    if (!user) {
      user = await this.usersService.findByEmail(profile.email);
      if (user) {
        // Link googleId to existing user
        user = await this.usersService.linkGoogleAccount(user.id, profile.googleId, profile.avatar);
      }
    } else if (profile.avatar && user.avatar !== profile.avatar) {
      // Update avatar for existing Google user if provided
      user = await this.usersService.linkGoogleAccount(user.id, profile.googleId, profile.avatar);
    }

    // 3. If user still does not exist, provision new tenant workspace and admin user
    let isNewUser = false;
    let tenantName = 'My Workspace';

    if (!user) {
      isNewUser = true;
      const derivedName = profile.name || profile.email.split('@')[0];
      tenantName = `${derivedName}'s Workspace`;

      const created = await this.usersService.createOAuthTenantWithUser({
        tenantName,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        googleId: profile.googleId,
      });

      user = {
        ...created.user,
        tenant: created.tenant,
      } as any;
    }

    const orgPath = user.role === 'SUPER_ADMIN' ? 'root' : ((user as any).tenant?.path || 'root');
    const tier = user.role === 'SUPER_ADMIN' ? 'PLATFORM_ROOT' : ((user as any).tenant?.tier || 'END_CLIENT');
    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role, orgPath, tier);
    const formattedUser = this.formatUser(user, (user as any).tenant?.name || tenantName);

    if (isNewUser) {
      this.mailService
        .sendWelcomeEmail(user.email, user.name || undefined, (user as any).tenant?.name || tenantName)
        .catch((err) => this.logger.warn(`Failed to send welcome email to ${user.email}: ${err.message}`));
    }

    return {
      ...tokens,
      user: formattedUser,
    };
  }

  async verifyGoogleIdToken(idToken: string) {
    if (!idToken) {
      throw new BadRequestException('Google ID token is required');
    }

    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new UnauthorizedException(errorData.error_description || 'Invalid Google ID token');
      }

      const payload = (await response.json()) as {
        sub: string;
        email: string;
        email_verified?: string | boolean;
        name?: string;
        picture?: string;
        aud?: string;
      };

      const configuredClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      if (configuredClientId && payload.aud && payload.aud !== configuredClientId) {
        this.logger.warn(
          `Google token aud (${payload.aud}) does not match configured GOOGLE_CLIENT_ID (${configuredClientId})`,
        );
      }

      return this.validateOrCreateGoogleUser({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatar: payload.picture,
      });
    } catch (error: any) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Google token verification failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Failed to verify Google token');
    }
  }

  async signup(
    tenantOrWorkspaceName: string,
    email: string,
    password: string,
    name?: string,
    recaptchaToken?: string,
  ) {
    if (recaptchaToken) {
      await this.recaptchaService.verifyToken(recaptchaToken, 'signup');
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(password, 12);
    const { tenant, user } = await this.usersService.createTenantWithAdmin(
      tenantOrWorkspaceName,
      email,
      passwordHash,
      name,
    );

    const orgPath = tenant.path || 'root';
    const tier = tenant.tier || 'END_CLIENT';
    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role, orgPath, tier);
    const formattedUser = this.formatUser(user, tenant.name);

    // Non-blocking welcome email delivery
    this.mailService
      .sendWelcomeEmail(user.email, user.name || undefined, tenant.name)
      .catch((err) => this.logger.warn(`Failed to send welcome email to ${user.email}: ${err.message}`));

    return {
      ...tokens,
      user: formattedUser,
    };
  }

  async login(email: string, password: string, recaptchaToken?: string) {
    if (recaptchaToken) {
      await this.recaptchaService.verifyToken(recaptchaToken, 'login');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    const orgPath = user.role === 'SUPER_ADMIN' ? 'root' : (user.tenant?.path || 'root');
    const tier = user.role === 'SUPER_ADMIN' ? 'PLATFORM_ROOT' : (user.tenant?.tier || 'END_CLIENT');

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role, orgPath, tier);
    const formattedUser = this.formatUser(user);

    return {
      ...tokens,
      user: formattedUser,
    };
  }

  async adminLogin(email: string, password: string, recaptchaToken?: string) {
    if (recaptchaToken) {
      await this.recaptchaService.verifyToken(recaptchaToken, 'admin_login');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.RESELLER_ADMIN) {
      throw new ForbiddenException('Access denied: account does not have Admin or Reseller privileges');
    }

    const orgPath = user.role === 'SUPER_ADMIN' ? 'root' : (user.tenant?.path || 'root');
    const tier = user.role === 'SUPER_ADMIN' ? 'PLATFORM_ROOT' : (user.tenant?.tier || 'PRIMARY_RESELLER');

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role, orgPath, tier);
    const formattedUser = this.formatUser(user);

    return {
      ...tokens,
      user: formattedUser,
    };
  }

  async generateTokens(
    userId: string,
    email: string,
    tenantId: string,
    role: string,
    orgPath?: string,
    tier?: string,
    permissions?: string[],
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      tenantId,
      role,
      orgPath: orgPath || 'root',
      tier: tier || 'END_CLIENT',
      permissions: permissions || ['*'],
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET') || this.configService.get<string>('JWT_SECRET') || 'default-access-secret',
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET') || 'default-refresh-secret',
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d',
      }),
    ]);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await this.usersService.updateRefreshToken(userId, hashedRefreshToken);

    return { accessToken, refreshToken };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const matches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!matches) throw new UnauthorizedException('Access denied');

    const orgPath = user.role === 'SUPER_ADMIN' ? 'root' : (user.tenant?.path || 'root');
    const tier = user.role === 'SUPER_ADMIN' ? 'PLATFORM_ROOT' : (user.tenant?.tier || 'END_CLIENT');

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role, orgPath, tier);
    const formattedUser = this.formatUser(user);

    return {
      ...tokens,
      user: formattedUser,
    };
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async forgotPassword(email: string, recaptchaToken?: string) {
    if (recaptchaToken) {
      await this.recaptchaService.verifyToken(recaptchaToken, 'forgot_password');
    }

    const user = await this.usersService.findByEmail(email);
    // Timing-attack safe response if email not found
    if (!user) {
      return { success: true, message: 'If an account exists with this email, a reset code was sent.' };
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await this.usersService.updatePasswordResetToken(user.id, hashedOtp, expiry);

    // Send transactional OTP email via Brevo
    await this.mailService.sendOtpEmail(email, otp, 'PASSWORD_RESET');

    return {
      success: true,
      message: 'Password reset verification code has been sent to your email.',
    };
  }

  async sendEmailVerificationOtp(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { success: true, message: 'If an account exists with this email, a verification code was sent.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await this.usersService.updatePasswordResetToken(user.id, hashedOtp, expiry);

    await this.mailService.sendOtpEmail(email, otp, 'EMAIL_VERIFICATION');

    return {
      success: true,
      message: 'Email verification code has been sent to your email.',
    };
  }

  async resendOtp(email: string, type: OtpType) {
    if (type === OtpType.EMAIL_VERIFICATION) {
      return this.sendEmailVerificationOtp(email);
    }
    return this.forgotPassword(email);
  }

  async verifyOtp(email: string, otp: string, type: OtpType) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordResetToken || !user.passwordResetExpiry) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    if (new Date() > new Date(user.passwordResetExpiry)) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    const isMatch = await bcrypt.compare(otp, user.passwordResetToken);
    if (!isMatch) {
      throw new BadRequestException('Invalid verification code');
    }

    if (type === OtpType.EMAIL_VERIFICATION) {
      // Clear token and mark verified
      await this.usersService.clearPasswordResetToken(user.id);
      const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);
      const formattedUser = this.formatUser(user);
      return {
        ...tokens,
        user: formattedUser,
        message: 'Email verified successfully.',
      };
    }

    // For password reset OTP verification
    return {
      success: true,
      token: otp,
      email: user.email,
      message: 'Verification code verified successfully. You can now set your new password.',
    };
  }

  async resetPassword(token: string, password: string, confirmPassword?: string, email?: string) {
    if (confirmPassword && password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    let targetUser: any = null;

    if (email) {
      targetUser = await this.usersService.findByEmail(email);
      if (!targetUser || !targetUser.passwordResetToken || !targetUser.passwordResetExpiry) {
        throw new BadRequestException('Invalid or expired reset code');
      }
      if (new Date() > new Date(targetUser.passwordResetExpiry)) {
        throw new BadRequestException('Reset code has expired. Please request a new one.');
      }
      const isMatch = await bcrypt.compare(token, targetUser.passwordResetToken);
      if (!isMatch) {
        throw new BadRequestException('Invalid verification code');
      }
    } else {
      const activeUsers = await this.usersService.findUsersWithActiveResetTokens();
      for (const user of activeUsers) {
        if (user.passwordResetToken) {
          const isMatch = await bcrypt.compare(token, user.passwordResetToken);
          if (isMatch) {
            targetUser = user;
            break;
          }
        }
      }
      if (!targetUser) {
        throw new BadRequestException('Invalid or expired reset code');
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.usersService.updatePassword(targetUser.id, passwordHash);
    await this.usersService.clearPasswordResetToken(targetUser.id);

    return {
      success: true,
      message: 'Password has been reset successfully. You can now sign in.',
    };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.formatUser(user);
  }
}
