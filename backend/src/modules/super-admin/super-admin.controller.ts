import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { SuperAdminAuthGuard } from './guards/super-admin-auth.guard';
import { SuperAdminService } from './super-admin.service';
import {
  SuperAdminLoginDto,
  CreatePartnerDto,
  UpdatePartnerDto,
  UpdatePartnerStatusDto,
  CreateWholesalePlanDto,
  UpdateWholesalePlanDto,
  CreateDomainDto,
  UpdateClientStatusDto,
} from './dto/super-admin.dto';

@ApiTags('Super Admin Platform Engine')
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  // ==========================================
  // 1. DEDICATED SUPER ADMIN AUTHENTICATION
  // ==========================================
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Secure Tier-0 Super Admin login' })
  async login(
    @Body() dto: SuperAdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await this.service.login(dto, ip);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('appnix_superadmin_token', result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    return { success: true, data: result };
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear Super Admin session and cookies' })
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const clearOpts = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.clearCookie('appnix_superadmin_token', clearOpts);
    res.clearCookie('appnix_superadmin_refresh_token', clearOpts);
    res.clearCookie('appnix_access_token', { path: '/' });
    res.clearCookie('appnix_auth_token', { path: '/' });
    res.clearCookie('appnix_refresh_token', { path: '/' });
    return { success: true, message: 'Super admin logged out successfully' };
  }

  @Get('auth/me')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated super administrator profile' })
  async getMe(@CurrentUser() actor: AuthUser) {
    const me = await this.service.getMe(actor.userId);
    return { success: true, data: me };
  }

  // ==========================================
  // 2. PLATFORM DASHBOARD
  // ==========================================
  @Get('dashboard/overview')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Platform-wide aggregated metrics & MRR overview' })
  async getDashboardOverview() {
    const data = await this.service.getDashboardOverview();
    return { success: true, data };
  }

  // ==========================================
  // 3. WHITE-LABEL PARTNERS / RESELLERS
  // ==========================================
  @Get('partners')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all White-Label Admins / Partners' })
  async getPartners(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.getPartners({ search, status, page, limit });
    return { success: true, data };
  }

  @Post('partners')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Provision new White-Label Partner & Admin credentials' })
  async createPartner(
    @Body() dto: CreatePartnerDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.createPartner(dto, actor.userId, actor.email);
    return { success: true, data, message: 'Partner created successfully' };
  }

  @Get('partners/check-slug')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if a partner workspace slug is available' })
  async checkPartnerSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const result = await this.service.checkSlugAvailability(slug, excludeId);
    return { success: true, ...result };
  }

  @Get('partners/:id')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full White-Label Partner profile and client subtree' })
  async getPartnerById(
    @Param('id') id: string,
    @Query('clientPage') clientPage?: string,
    @Query('clientLimit') clientLimit?: string,
  ) {
    const data = await this.service.getPartnerById(id, { clientPage, clientLimit });
    return { success: true, data };
  }

  @Get('partners/:id/commission-history')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get White-Label Partner monthly recurring commission history' })
  async getPartnerCommissionHistory(@Param('id') id: string) {
    const data = await this.service.getPartnerCommissionHistory(id);
    return { success: true, data };
  }

  @Patch('partners/:id')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Partner configuration, wholesale pricing, or branding' })
  async updatePartner(
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.updatePartner(id, dto, actor.userId, actor.email);
    return { success: true, data, message: 'Partner updated successfully' };
  }

  @Patch('partners/:id/status')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend or Activate Partner account' })
  async updatePartnerStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePartnerStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.updatePartnerStatus(
      id,
      dto.status,
      actor.userId,
      dto.reason,
      actor.email,
    );
    return { success: true, data, message: `Partner status set to ${dto.status}` };
  }

  @Post('partners/:id/impersonate')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate short-lived delegated inspection token for partner workspace' })
  async impersonatePartner(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.beginWorkspaceInspection(actor, id);
    return { success: true, data };
  }

  // Preserved backwards compatibility / delegated inspection
  @Post('impersonation')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate short-lived delegated inspection token for workspace' })
  beginWorkspaceInspection(
    @CurrentUser() actor: AuthUser,
    @Body('workspaceId') workspaceId: string,
  ) {
    return this.service.beginWorkspaceInspection(actor, workspaceId);
  }

  // ==========================================
  // 4. CLIENT ACCOUNTS
  // ==========================================
  @Get('clients')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all End-Client accounts across all partners' })
  async getClients(
    @Query('partnerId') partnerId?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.getClients({ partnerId, status, plan, search, page, limit });
    return { success: true, data };
  }

  @Get('clients/:id')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full End-Client details for Super Admin inspection' })
  async getClientById(@Param('id') id: string) {
    const data = await this.service.getClientById(id);
    return { success: true, data };
  }

  @Patch('clients/:id/status')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend or Activate End-Client account' })
  async updateClientStatus(
    @Param('id') id: string,
    @Body() dto: UpdateClientStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.updateClientStatus(
      id,
      dto.status,
      actor.userId,
      dto.reason,
      actor.email,
    );
    return { success: true, data, message: `Client status updated to ${dto.status}` };
  }

  // ==========================================
  // 5. WHOLESALE PLANS (WHITE-LABEL PLANS)
  // ==========================================
  @Get('wholesale-plans')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all standard wholesale plans' })
  async getWholesalePlans(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.getWholesalePlans({ search, page, limit });
    return { success: true, data };
  }

  @Post('wholesale-plans')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new Wholesale Plan with setup fee and per-client pricing' })
  async createWholesalePlan(
    @Body() dto: CreateWholesalePlanDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.createWholesalePlan(dto, actor.userId, actor.email);
    return { success: true, data, message: 'Wholesale plan created successfully' };
  }

  @Patch('wholesale-plans/:id')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Wholesale Plan pricing and feature limits' })
  async updateWholesalePlan(
    @Param('id') id: string,
    @Body() dto: UpdateWholesalePlanDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.updateWholesalePlan(id, dto, actor.userId, actor.email);
    return { success: true, data, message: 'Wholesale plan updated successfully' };
  }

  @Delete('wholesale-plans/:id')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive or Delete a Wholesale Plan' })
  async deleteWholesalePlan(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.deleteWholesalePlan(id, actor.userId, actor.email);
    return { success: true, data };
  }

  // ==========================================
  // 6. SUBSCRIPTIONS, REVENUE & PAYMENT ORDERS
  // ==========================================
  @Get('subscriptions')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View subscriptions, plans, payments and revenue' })
  async getSubscriptions(
    @Query('subPage') subPage?: string,
    @Query('subLimit') subLimit?: string,
    @Query('orderPage') orderPage?: string,
    @Query('orderLimit') orderLimit?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.service.getSubscriptionsSummary({
      subPage,
      subLimit,
      orderPage,
      orderLimit,
      search,
    });
    return { success: true, data };
  }

  // ==========================================
  // 7. CUSTOM DOMAINS & REAL DNS VERIFICATION
  // ==========================================
  @Get('domains')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all partner custom domains and SSL statuses' })
  async getDomains(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.getDomains({ search, page, limit });
    return { success: true, data };
  }

  @Post('domains')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Map a new custom domain to a White-Label partner' })
  async addDomain(
    @Body() dto: CreateDomainDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.addDomain(dto, actor.userId, actor.email);
    return { success: true, data, message: 'Custom domain registered. DNS records pending.' };
  }

  @Post('domains/:id/verify')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute real DNS verification via Node DNS resolution' })
  async verifyDomain(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.verifyDomain(id, actor.userId, actor.email);
    return { success: true, data };
  }

  @Delete('domains/:id')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a custom domain mapping' })
  async deleteDomain(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.service.deleteDomain(id, actor.userId, actor.email);
    return { success: true, data, message: 'Domain mapping removed.' };
  }

  // ==========================================
  // 8. PLATFORM-WIDE CHANNEL & USAGE MONITORING
  // ==========================================
  @Get('channels/usage')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Platform-wide channel traffic, volumes, delivery rates and wallet balances' })
  async getChannelUsage(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.getChannelUsage({ page, limit });
    return { success: true, data };
  }

  // ==========================================
  // 9. SYSTEM HEALTH
  // ==========================================
  @Get('health')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Real-time database latency, process memory, and microservice status' })
  async getSystemHealth() {
    const data = await this.service.getSystemHealth();
    return { success: true, data };
  }

  // ==========================================
  // 10. AUDIT LOGS
  // ==========================================
  @Get('audit-logs')
  @UseGuards(JwtAccessGuard, SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Audit trail of administrative mutations and inspections' })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.service.getAuditLogs({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
    return { success: true, data };
  }
}
