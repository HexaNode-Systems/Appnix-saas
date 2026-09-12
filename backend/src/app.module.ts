import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { BillingModule } from './modules/billing/billing.module';
import { CrmContactsModule } from './modules/crm/crm.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { MailModule } from './modules/mail/mail.module';
import { SupportModule } from './modules/support/support.module';
import { WhatsAppTemplatesModule } from './modules/whatsapp-templates/whatsapp-templates.module';
import { ChatModule } from './modules/chat/chat.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { DataStoreModule } from './modules/data-store/data-store.module';
import { AppCredentialsModule } from './modules/app-credentials/app-credentials.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SuperFieldsModule } from './modules/super-fields/super-fields.module';
import { ContactTagsModule } from './modules/contact-tags/contact-tags.module';
import { DepartmentModule } from './modules/department/department.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { InstagramModule } from './modules/instagram/instagram.module';
import { BotsModule } from './modules/bots/bots.module';
import { TeamModule } from './modules/team/team.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { HealthModule } from './modules/health/health.module';
import { StorageModule } from './modules/storage/storage.module';
import { MediaModule } from './modules/media/media.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { PartnerModule } from './modules/partner/partner.module';
import { SupportAuditInterceptor } from './common/interceptors/support-audit.interceptor';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    MediaModule,
    MailModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    BillingModule,
    CrmContactsModule,
    CampaignsModule,
    WhatsAppTemplatesModule,
    ChatModule,
    WorkflowsModule,
    DataStoreModule,
    AppCredentialsModule,
    SupportModule,
    DashboardModule,
    SuperFieldsModule,
    ContactTagsModule,
    DepartmentModule,
    WorkspaceModule,
    ChannelsModule,
    InstagramModule,
    BotsModule,
    TeamModule,
    AnalyticsModule,
    NotificationsModule,
    SettingsModule,
    WebhooksModule,
    HealthModule,
    SuperAdminModule,
    PartnerModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: SupportAuditInterceptor }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
