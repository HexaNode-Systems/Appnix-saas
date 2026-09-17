import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Put,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PartnerService } from './partner.service';
import { CreateDomainDto, UpdatePartnerBrandSettingsDto } from './dto/domain.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { ResellerPortalGuard } from '../../common/guards/reseller-portal.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Partner Portal')
@Controller('partner')
@UseGuards(JwtAccessGuard, ResellerPortalGuard)
@ApiBearerAuth()
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get('brand-settings')
  @ApiOperation({ summary: 'Get current reseller brand settings and domain verification state' })
  async getBrandSettings(@CurrentUser() actor: AuthUser) {
    const data = await this.partnerService.getBrandSettings(actor.tenantId);
    return { success: true, data };
  }

  @Put('brand-settings')
  @ApiOperation({ summary: 'Update reseller branding and register a changed custom domain' })
  async updateBrandSettings(
    @Body() dto: UpdatePartnerBrandSettingsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.partnerService.updateBrandSettings(actor.tenantId, dto);
    return { success: true, data };
  }

  @Post('brand-settings/verify-domain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the reseller custom domain configured in Brand Settings' })
  async verifyBrandSettingsDomain(@CurrentUser() actor: AuthUser) {
    const data = await this.partnerService.verifyBrandSettingsDomain(actor.tenantId);
    return data;
  }

  @Post('domains')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new custom domain for the reseller tenant' })
  async registerDomain(
    @Body() dto: CreateDomainDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.partnerService.registerDomain(actor.tenantId, dto);
    return { success: true, data };
  }

  @Post('domains/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform DNS resolution to verify CNAME/TXT records for custom domain' })
  async verifyDomain(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.partnerService.verifyDomain(actor.tenantId, id);
    return data;
  }

  @Get('domains')
  @ApiOperation({ summary: 'List all custom domains registered for the reseller tenant' })
  async getDomains(@CurrentUser() actor: AuthUser) {
    const data = await this.partnerService.getDomains(actor.tenantId);
    return { success: true, data };
  }

  @Delete('domains/:id')
  @ApiOperation({ summary: 'Remove a custom domain mapping' })
  async deleteDomain(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    const data = await this.partnerService.deleteDomain(actor.tenantId, id);
    return data;
  }
}
