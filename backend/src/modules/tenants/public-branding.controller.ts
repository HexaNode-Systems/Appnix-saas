import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';

@ApiTags('Public Tenant Branding')
@Controller('public')
export class PublicBrandingController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('tenant-branding')
  @ApiOperation({ summary: 'Get verified custom-domain branding without authentication' })
  async getTenantBranding(@Query('domain') domain: string) {
    const data = await this.tenantsService.getPublicTenantBranding(domain);
    return { success: true, data };
  }
}
