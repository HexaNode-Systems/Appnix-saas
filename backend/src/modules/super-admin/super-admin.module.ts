import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminDnsService } from './services/super-admin-dns.service';
import { SuperAdminFirebaseService } from './services/super-admin-firebase.service';
import { SuperAdminAuthGuard } from './guards/super-admin-auth.guard';

@Module({
  imports: [ConfigModule, JwtModule, AuthModule, MailModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, SuperAdminDnsService, SuperAdminFirebaseService, SuperAdminAuthGuard],
  exports: [SuperAdminService, SuperAdminDnsService, SuperAdminFirebaseService],
})
export class SuperAdminModule {}
