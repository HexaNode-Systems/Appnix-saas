import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CreateTenantDto, UpdateTenantBrandingDto } from './dto/create-tenant.dto';
import { CreateClientDto, UpdateClientDto } from './dto/create-client.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { SessionContext } from '../../lib/auth/session-context';
import { Request } from 'express';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('resolve-domain')
  @ApiOperation({ summary: 'Resolve incoming hostname to tenant branding and white-label settings' })
  @ApiQuery({ name: 'host', required: false, description: 'Hostname to resolve (defaults to Host header)' })
  resolveDomain(@Query('host') queryHost: string, @Req() req: Request) {
    const host = queryHost || req.headers.host || '';
    return this.tenantsService.resolveDomain(host);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get all tenants scoped to caller hierarchy' })
  findAll(@CurrentUser() actor: AuthUser) {
    return this.tenantsService.findAll(actor as unknown as SessionContext);
  }

  @Get('hierarchy')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get recursive organization tree for reseller or super admin' })
  getHierarchy(@CurrentUser() actor: AuthUser) {
    return this.tenantsService.getHierarchy(actor as unknown as SessionContext);
  }

  @Get('current/branding')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get branding settings for current authenticated tenant' })
  async getCurrentBranding(@CurrentUser() actor: AuthUser) {
    const tenantId = actor.tenantId || (await this.tenantsService.getRootTenantId());
    if (!tenantId) {
      throw new BadRequestException('Tenant organization context not found');
    }
    return this.tenantsService.findOne(tenantId, actor as unknown as SessionContext);
  }

  @Patch('current/branding')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Update branding settings for current authenticated tenant' })
  async updateCurrentBranding(
    @Body() body: UpdateTenantBrandingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const tenantId = actor.tenantId || (await this.tenantsService.getRootTenantId());
    if (!tenantId) {
      throw new BadRequestException('Tenant organization context not found');
    }
    return this.tenantsService.updateBranding(tenantId, body, actor as unknown as SessionContext);
  }

  // ==========================================
  // HIERARCHICAL WHITE-LABEL CLIENT MANAGEMENT
  // ==========================================

  @Get('clients')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get end clients scoped to authenticated reseller or super admin' })
  async getClients(
    @CurrentUser() actor: AuthUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.tenantsService.getClients(actor as unknown as SessionContext, {
      search,
      status,
      plan,
      page,
      limit,
    });
    return { success: true, data };
  }

  @Post('clients')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Provision new end client under authenticated partner' })
  async createClient(
    @Body() body: CreateClientDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.tenantsService.createClient(body, actor as unknown as SessionContext);
    return { success: true, data, message: 'Client created successfully' };
  }

  @Get('clients/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get single end client details' })
  async getClientById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    const data = await this.tenantsService.getClientById(id, actor as unknown as SessionContext);
    return { success: true, data };
  }

  @Patch('clients/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Update end client details' })
  async updateClient(
    @Param('id') id: string,
    @Body() body: UpdateClientDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.tenantsService.updateClient(id, body, actor as unknown as SessionContext);
    return { success: true, data };
  }

  @Patch('clients/:id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Update end client status' })
  async updateClientStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.tenantsService.updateClientStatus(id, status, actor as unknown as SessionContext);
    return { success: true, data };
  }

  @Delete('clients/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Delete or deactivate end client' })
  async deleteClient(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    const data = await this.tenantsService.deleteClient(id, actor as unknown as SessionContext);
    return { success: true, ...data };
  }

  @Post('clients/:id/guest-login')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Login as Guest to an End-Client account' })
  async loginAsGuest(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const data = await this.tenantsService.loginAsGuest(id, actor as unknown as SessionContext, ip);
    return { success: true, data };
  }

  @Post('clients/:id/impersonate')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Login as Guest to an End-Client account (alias)' })
  async impersonateClient(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const data = await this.tenantsService.loginAsGuest(id, actor as unknown as SessionContext, ip);
    return { success: true, data };
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get tenant by ID with ancestry verification' })
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.tenantsService.findOne(id, actor as unknown as SessionContext);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Create new tenant or downstream sub-reseller' })
  create(@Body() body: CreateTenantDto, @CurrentUser() actor: AuthUser) {
    return this.tenantsService.create(body, actor as unknown as SessionContext);
  }

  @Patch(':id/branding')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Update white-label branding, logo, colors, and custom domain' })
  updateBranding(
    @Param('id') id: string,
    @Body() body: UpdateTenantBrandingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.tenantsService.updateBranding(id, body, actor as unknown as SessionContext);
  }
}
