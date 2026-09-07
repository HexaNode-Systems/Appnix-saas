import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { RecaptchaService } from './recaptcha.service';
import { RecaptchaGuard } from './guards/recaptcha.guard';
import { SessionContextResolver } from '../../lib/auth/session-context';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

import { TenantContextStore } from '../../lib/auth/tenant-context.store';

@Global()
@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule, MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    GoogleAuthGuard,
    RecaptchaService,
    RecaptchaGuard,
    SessionContextResolver,
    TenantContextStore,
    SuperAdminGuard,
    JwtAccessGuard,
    JwtRefreshGuard,
  ],
  // SuperAdminModule signs short-lived support contexts with the same configured
  // JWT provider, so re-export the module rather than creating a second signer.
  exports: [
    JwtModule,
    AuthService,
    RecaptchaService,
    RecaptchaGuard,
    SessionContextResolver,
    TenantContextStore,
    SuperAdminGuard,
    JwtAccessGuard,
    JwtRefreshGuard,
  ],
})
export class AuthModule {}
