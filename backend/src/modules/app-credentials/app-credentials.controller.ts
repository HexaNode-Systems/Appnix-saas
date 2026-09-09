import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppCredentialsService } from './app-credentials.service';
import { CreateAppCredentialDto } from './dto/create-app-credential.dto';
import { UpdateAppCredentialDto } from './dto/update-app-credential.dto';
import { ValidateLiveCredentialDto } from './dto/test-connection.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@ApiTags('App Credentials')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller(['automations/app-credentials', 'app-credentials', 'api/app-credentials'])
export class AppCredentialsController {
  constructor(private readonly appCredentialsService: AppCredentialsService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Get catalog of 3rd party apps (Shopify, OpenAI, Cashfree, Google Sheets)' })
  getAvailableApps() {
    return this.appCredentialsService.getAvailableApps();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get summary metrics of connected app credentials' })
  async getSummary(@CurrentUser() user?: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.appCredentialsService.getSummary(tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all saved app credentials for workspace' })
  async getCredentials(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.appCredentialsService.getCredentials(tenantId, { search, category, status });
  }

  @Post('validate-live')
  @ApiOperation({ summary: 'Validate API credentials with live 3rd party servers' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async validateLive(@Body() dto: ValidateLiveCredentialDto) {
    return this.appCredentialsService.validateLive(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get app credential by ID' })
  async getCredentialById(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.appCredentialsService.getCredentialById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Store encrypted app credential' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createCredential(
    @Body() dto: CreateAppCredentialDto,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.appCredentialsService.createCredential(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update credential' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateCredential(
    @Param('id') id: string,
    @Body() dto: UpdateAppCredentialDto,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.appCredentialsService.updateCredential(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete credential' })
  async deleteCredential(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.appCredentialsService.deleteCredential(tenantId, id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test health check connection for saved credential' })
  async testConnection(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.appCredentialsService.testConnection(tenantId, id);
  }
}
