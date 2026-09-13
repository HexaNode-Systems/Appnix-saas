import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  SignupDto,
  LoginDto,
  AdminLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyOtpDto,
  ResendOtpDto,
  GoogleAuthDto,
} from './dto/auth.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Request, Response } from 'express';
import { GoogleUserProfile } from './strategies/google.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth 2.0 web login redirect' })
  @ApiResponse({ status: 302, description: 'Redirects browser to Google OAuth consent screen.' })
  async googleAuth() {
    // Handled by GoogleAuthGuard redirect
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback handler (redirects to frontend)' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with tokens.' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as GoogleUserProfile;
    const result = await this.authService.validateOrCreateGoogleUser(googleUser);

    const clientPortalUrl = this.resolveClientPortalUrl(req);
    const redirectTarget = `${clientPortalUrl}/auth/callback?token=${encodeURIComponent(
      result.accessToken,
    )}&refreshToken=${encodeURIComponent(result.refreshToken)}`;

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.redirect(redirectTarget);
  }

  private resolveClientPortalUrl(req: Request): string {
    // 1. If state param originated from localhost, return that origin directly
    const stateParam = req.query?.state as string | undefined;
    if (stateParam) {
      try {
        const parsed = new URL(stateParam);
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
          return parsed.origin;
        }
      } catch {
        // Invalid state URL format, continue
      }
    }

    // 2. Explicit Client Portal URL configured in environment
    const clientAppUrl =
      this.configService.get<string>('CLIENT_APP_URL') ||
      this.configService.get<string>('APP_URL');
    if (clientAppUrl) {
      return clientAppUrl.replace(/\/+$/, '');
    }

    // 3. Validate state param if passed during OAuth initiation
    if (stateParam) {
      try {
        const parsed = new URL(stateParam);
        const hostname = parsed.hostname.toLowerCase();
        const isAllowedHost =
          hostname === 'app.appnix.co.in' ||
          hostname === 'appnix.co.in' ||
          hostname === 'www.appnix.co.in' ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.endsWith('.localhost');

        if (isAllowedHost) {
          // If state was on root or www landing alias, target the client portal subdomain directly
          if (hostname === 'appnix.co.in' || hostname === 'www.appnix.co.in') {
            return 'https://app.appnix.co.in';
          }
          return parsed.origin;
        }
      } catch {
        // Invalid state URL format, fall through to default resolution
      }
    }

    // 3. Inspect FRONTEND_URL and map landing domain to client portal subdomain
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
    if (frontendUrl) {
      try {
        const parsed = new URL(frontendUrl);
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === 'appnix.co.in' || hostname === 'www.appnix.co.in') {
          return 'https://app.appnix.co.in';
        }
        return frontendUrl.replace(/\/+$/, '');
      } catch {
        if (frontendUrl.includes('appnix.co.in')) {
          return 'https://app.appnix.co.in';
        }
      }
    }

    // 4. Fallback defaults
    return process.env.NODE_ENV === 'production'
      ? 'https://app.appnix.co.in'
      : 'http://localhost:3000';
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Google ID Token / One-Tap credential' })
  @ApiBody({ type: GoogleAuthDto })
  @ApiResponse({ status: 200, description: 'Authenticated successfully via Google ID token.' })
  @ApiResponse({ status: 401, description: 'Invalid Google token.' })
  async googleTokenAuth(@Body() dto: GoogleAuthDto) {
    const result = await this.authService.verifyGoogleIdToken(dto.idToken);
    return { success: true, data: result };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = isProd ? '.appnix.co.in' : undefined;

    res.cookie('appnix_access_token', accessToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge: 15 * 60 * 1000, // 15 mins
      path: '/',
    });
    res.cookie('appnix_auth_token', accessToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge: 15 * 60 * 1000, // 15 mins
      path: '/',
    });
    res.cookie('appnix_refresh_token', refreshToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      domain: cookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  @Post('signup')
  @ApiOperation({ summary: 'Create a tenant workspace and first admin user' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'Tenant and admin created successfully.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const workspaceName = dto.workspaceName || dto.tenantName || 'My Workspace';
    const result = await this.authService.signup(workspaceName, dto.email, dto.password, dto.name, dto.recaptchaToken);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { success: true, data: result };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in and return user profile + access & refresh tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Signed in successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password, dto.recaptchaToken);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { success: true, data: result };
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in to the Admin/Reseller Portal with privilege check' })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({ status: 200, description: 'Admin signed in successfully.' })
  @ApiResponse({ status: 403, description: 'User is not an admin or reseller.' })
  async adminLogin(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.adminLogin(
      dto.email,
      dto.password,
      dto.recaptchaToken,
      dto.orgSlug,
      dto.mfaCode,
    );
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { success: true, data: result };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a 6-digit password reset OTP sent to email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Reset email/OTP dispatched successfully.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.email, dto.recaptchaToken);
    return { success: true, ...result };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit OTP code' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(dto.email, dto.otp, dto.type);
    return { success: true, data: result };
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification or reset OTP' })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP resent successfully.' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    const result = await this.authService.resendOtp(dto.email, dto.type);
    return { success: true, ...result };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password using token/OTP' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid token or mismatched passwords.' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto.token, dto.password, dto.confirmPassword, dto.email);
    return { success: true, ...result };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as { userId: string; refreshToken: string };
    const result = await this.authService.refreshTokens(user.userId, user.refreshToken);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { success: true, data: result };
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMe(@Req() req: Request) {
    const authUser = req.user as { userId: string; tenantId?: string };
    const user = await this.authService.getMe(authUser.userId, authUser.tenantId);
    return { success: true, data: user };
  }

  @Post('logout')
  @Get('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate the current refresh token and clear auth cookies' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      let userId = (req.user as { userId?: string } | undefined)?.userId;
      if (!userId) {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        const rawToken =
          typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7).trim()
            : (req.cookies?.['appnix_access_token'] || req.cookies?.['appnix_refresh_token']);

        if (rawToken && typeof rawToken === 'string') {
          const parts = rawToken.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            userId = payload.sub || payload.userId;
          }
        }
      }

      if (userId) {
        await this.authService.logout(userId);
      }
    } catch {
      // Invalidation is best-effort, always proceed to clear cookies
    }

    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomains = isProd ? [undefined, '.appnix.co.in'] : [undefined];
    const authCookieNames = [
      'appnix_access_token',
      'appnix_refresh_token',
      'appnix_auth_token',
      'appnix_admin_token',
      'appnix_admin_refresh_token',
      'appnix_superadmin_token',
      'appnix_superadmin_refresh_token',
    ];

    for (const cookieName of authCookieNames) {
      for (const domain of cookieDomains) {
        res.clearCookie(cookieName, { path: '/', domain, httpOnly: true, secure: isProd, sameSite: 'lax' });
        res.clearCookie(cookieName, { path: '/', domain, httpOnly: false, secure: isProd, sameSite: 'lax' });
      }
    }

    return { success: true, message: 'Logged out successfully' };
  }
}