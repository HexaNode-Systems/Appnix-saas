import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CreateTenantDto, UpdateTenantBrandingDto } from './dto/create-tenant.dto';
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
