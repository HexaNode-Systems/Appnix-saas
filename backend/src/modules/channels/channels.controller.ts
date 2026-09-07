import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import {
  ConnectChannelDto,
  MetaEmbeddedSignupDto,
  ConnectFacebookPageDto,
  FacebookOAuthExchangeDto,
  VerifyFacebookTokenDto,
} from './dto/channels.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Channels')
@ApiBearerAuth()
@Controller(['channels', 'api/channels'])
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get status and details of all communication channels' })
  async getAllChannels(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.getAllChannels(tenantId);
  }

  @Get('whatsapp/config-public')
  @ApiOperation({ summary: 'Get public Meta App configuration for Embedded Signup SDK popup' })
  getPublicMetaConfig() {
    return this.channelsService.getPublicMetaConfig();
  }

  @Get('whatsapp/status')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get WhatsApp Cloud API connection status and verified WABA details' })
  async getWhatsAppStatus(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.getWhatsAppStatus(tenantId);
  }

  @Post('whatsapp/embedded-signup')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete Meta Embedded Signup onboarding callback, exchange access token, and verify WABA' })
  @ApiResponse({ status: 200, description: 'WhatsApp Business Account verified and connected successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid Meta onboarding payload or verification failure.' })
  async handleMetaEmbeddedSignup(
    @CurrentUser() user: AuthUser,
    @Body() dto: MetaEmbeddedSignupDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.handleMetaEmbeddedSignup(tenantId, dto);
  }

  @Post('whatsapp/sync')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-sync live WhatsApp channel status and limits with Meta Graph API' })
  async syncWhatsAppChannel(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.getWhatsAppStatus(tenantId);
  }

  // ----------------- FACEBOOK PAGE ENDPOINTS -----------------

  @Get('facebook/oauth/url')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Generate Meta OAuth dialog URL for Facebook Pages & Messenger' })
  getFacebookOAuthUrl(
    @CurrentUser() user: AuthUser,
    @Query('redirectUri') redirectUri?: string,
    @Query('configId') configId?: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.getFacebookOAuthUrl(tenantId, redirectUri, configId);
  }

  @Post('facebook/verify-token')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Facebook Page Access Token or User Token directly with Meta Graph API' })
  async verifyFacebookToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyFacebookTokenDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.verifyFacebookToken(tenantId, dto.accessToken, dto.pageId);
  }

  @Post('facebook/oauth/exchange')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange Meta OAuth code for Facebook Pages & Page Access Tokens' })
  async exchangeFacebookOAuthCode(
    @CurrentUser() user: AuthUser,
    @Body() dto: FacebookOAuthExchangeDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.exchangeFacebookOAuthCode(tenantId, dto.code, dto.redirectUri);
  }

  @Post('facebook/connect')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connect and provision a Facebook Page with Messenger Webhooks' })
  async connectFacebookPage(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConnectFacebookPageDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.connectFacebookPage(tenantId, dto);
  }

  @Get('facebook/status')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get Facebook Page connection status' })
  async getFacebookStatus(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.getFacebookStatus(tenantId);
  }

  @Post('facebook/sync')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync Facebook Page with Meta Graph API' })
  async syncFacebookChannel(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.syncFacebookChannel(tenantId);
  }

  @Get('facebook/activity')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get real Messenger message metrics and recent conversations' })
  async getFacebookActivity(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.getFacebookActivity(tenantId);
  }

  @Post('connect')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Connect a channel (WhatsApp, Instagram, Facebook, RCS)' })
  async connectChannel(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConnectChannelDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.connectChannel(tenantId, dto);
  }

  @Post('disconnect/:channel')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Disconnect a channel' })
  async disconnectChannel(
    @CurrentUser() user: AuthUser,
    @Param('channel') channel: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.disconnectChannel(tenantId, channel);
  }

  @Get('balance')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get channel balance and summary metrics' })
  async getChannelBalance(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.getChannelBalance(tenantId);
  }

  @Get('transactions')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get channel debit/credit transaction ledger' })
  async getChannelTransactions(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.getChannelTransactions(tenantId);
  }

  @Get('statistics')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get channel delivery statistics and volume breakdown' })
  async getChannelStatistics(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.channelsService.getChannelStatistics(tenantId);
  }
}
