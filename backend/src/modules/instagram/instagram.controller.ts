import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { InstagramService } from './instagram.service';
import {
  ExchangeOAuthCodeDto,
  ConnectInstagramAccountDto,
  VerifyInstagramTokenDto,
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  ToggleRuleDto,
} from './dto/instagram.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Instagram Channels & Automations')
@Controller(['channels/instagram', 'api/channels/instagram'])
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  // -------------------------------------------------------------
  // 1. OAUTH FLOW & TOKEN VERIFICATION
  // -------------------------------------------------------------

  @Get('oauth/url')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate Meta Graph API OAuth dialog URL with required permissions' })
  getOAuthUrl(
    @CurrentUser() user: AuthUser,
    @Query('redirectUri') redirectUri?: string,
    @Query('configId') configId?: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.getOAuthUrl(tenantId, redirectUri, configId);
  }

  @Post('oauth/exchange')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange Meta OAuth code for long-lived tokens and discover connected Instagram accounts' })
  async exchangeOAuthCode(
    @CurrentUser() user: AuthUser,
    @Body() dto: ExchangeOAuthCodeDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.exchangeOAuthCode(tenantId, dto.code, dto.redirectUri);
  }

  @Post('verify-token')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Page/IG Access Token directly with Meta Graph API and discover linked Instagram accounts' })
  async verifyToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyInstagramTokenDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.verifyToken(
      tenantId,
      dto.accessToken,
      dto.instagramBusinessId,
      dto.pageId,
    );
  }

  @Post('connect')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect an Instagram Professional Account with encrypted access token' })
  async connectAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConnectInstagramAccountDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.connectAccount(tenantId, dto);
  }

  // -------------------------------------------------------------
  // 2. CHANNEL LISTING & DETAILS
  // -------------------------------------------------------------

  @Get()
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all connected Instagram channels for tenant' })
  async getChannels(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.getChannels(tenantId);
  }

  @Get('rules')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all Comment-to-DM automation rules across all channels for tenant' })
  async getAllTenantRules(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.getAllTenantRules(tenantId);
  }

  @Patch('rules/:ruleId/toggle')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle rule active/paused state by ruleId' })
  async toggleRuleDirect(
    @CurrentUser() user: AuthUser,
    @Param('ruleId') ruleId: string,
    @Body() dto: ToggleRuleDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.toggleRuleDirect(tenantId, ruleId, dto.isActive);
  }

  @Delete('rules/:ruleId')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a Comment-to-DM automation rule by ruleId' })
  async deleteRuleDirect(
    @CurrentUser() user: AuthUser,
    @Param('ruleId') ruleId: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.deleteRuleDirect(tenantId, ruleId);
  }

  @Post('rules/simulate')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Simulate comment trigger against active rule' })
  async simulateRule(
    @CurrentUser() user: AuthUser,
    @Body() dto: { ruleId?: string; commentText: string; username?: string; rule?: any },
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.simulateRule(tenantId, dto);
  }

  @Get('logs')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get execution history across all tenant channels' })
  async getAllTenantLogs(
    @CurrentUser() user: AuthUser,
    @Query('channelId') channelId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.instagramService.getAllTenantLogs(tenantId, channelId, pageNum, limitNum);
  }

  @Get(':id')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get details of a specific Instagram channel' })
  async getChannelById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.getChannelById(tenantId, id);
  }

  @Post(':id/sync')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-verify and sync Instagram channel live status with Meta Graph API' })
  async syncChannel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.syncChannel(tenantId, id);
  }

  @Post(':id/disconnect')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect an Instagram channel' })
  async disconnectChannel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.disconnectChannel(tenantId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete and remove an Instagram channel' })
  async deleteChannel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.deleteChannel(tenantId, id);
  }

  // -------------------------------------------------------------
  // 3. AUTOMATION RULES CRUD
  // -------------------------------------------------------------

  @Get(':id/rules')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all Comment-to-DM automation rules for channel' })
  async getRules(
    @CurrentUser() user: AuthUser,
    @Param('id') channelId: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.getRules(tenantId, channelId);
  }

  @Post(':id/rules')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new Comment-to-DM automation rule' })
  async createRule(
    @CurrentUser() user: AuthUser,
    @Param('id') channelId: string,
    @Body() dto: CreateAutomationRuleDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.createRule(tenantId, channelId, dto);
  }

  @Put(':id/rules/:ruleId')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing Comment-to-DM automation rule' })
  async updateRule(
    @CurrentUser() user: AuthUser,
    @Param('id') channelId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateAutomationRuleDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.updateRule(tenantId, channelId, ruleId, dto);
  }

  @Patch(':id/rules/:ruleId/toggle')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle rule active/paused state' })
  async toggleRule(
    @CurrentUser() user: AuthUser,
    @Param('id') channelId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: ToggleRuleDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.toggleRule(tenantId, channelId, ruleId, dto.isActive);
  }

  @Delete(':id/rules/:ruleId')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a Comment-to-DM automation rule' })
  async deleteRule(
    @CurrentUser() user: AuthUser,
    @Param('id') channelId: string,
    @Param('ruleId') ruleId: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.instagramService.deleteRule(tenantId, channelId, ruleId);
  }

  // -------------------------------------------------------------
  // 4. AUTOMATION AUDIT LOGS
  // -------------------------------------------------------------

  @Get(':id/logs')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get execution history and delivery telemetry for channel automations' })
  async getLogs(
    @CurrentUser() user: AuthUser,
    @Param('id') channelId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.instagramService.getLogs(tenantId, channelId, pageNum, limitNum);
  }
}

// -------------------------------------------------------------
// 5. PUBLIC WEBHOOK CONTROLLER (META CHALLENGE & EVENT INGESTION)
// -------------------------------------------------------------

@ApiTags('Instagram Webhooks')
@Controller(['webhooks/instagram', 'api/v1/webhooks/instagram', 'instagram/webhook', 'channels/instagram/webhook', 'api/webhooks/instagram'])
export class InstagramWebhooksController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get()
  @ApiOperation({ summary: 'Meta Webhook Challenge Verification (Hub.Mode & Hub.Verify_Token)' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.instagramService.verifyWebhookSubscription(mode, token, challenge);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta Instagram Inbound Comments & Messages Webhook Receiver' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const rawBody = (req as any)?.rawBody || JSON.stringify(payload);

    // Verify HMAC signature if present
    if (signature && !this.instagramService.verifyWebhookSignature(rawBody, signature)) {
      return { status: 'ignored', reason: 'Invalid HMAC signature' };
    }

    // Immediately return 200 OK to Meta within milliseconds
    // and offload Comment-to-DM heavy processing asynchronously
    setImmediate(async () => {
      try {
        await this.instagramService.processWebhookAsync(payload);
      } catch (asyncErr) {
        // Log error without blocking response
        console.error('[Instagram Webhook Worker Error]:', asyncErr);
      }
    });

    return { status: 'EVENT_RECEIVED' };
  }
}
