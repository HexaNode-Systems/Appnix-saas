import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  SelectAudienceDto,
  SelectChannelDto,
  SelectTemplateDto,
  ConfigureTemplateDto,
  SendTestDto,
  LaunchCampaignDto,
  CampaignResponseDto,
  AudienceResponseDto,
  ChannelConfigResponseDto,
  MetaTemplateResponseDto,
  PaginatedResponseDto,
  ChannelType,
} from './dto/campaign.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, TenantGuard, SubscriptionGuard)
@Controller(['campaigns', 'api/campaigns', 'crm/campaigns', 'crm/bulk-campaign'])
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign draft' })
  @ApiResponse({ status: 201, type: CampaignResponseDto })
  async createDraft(
    @Request() req: any,
    @Body() dto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.createDraft(req.user.tenantId, req.user.userId || req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedResponseDto<CampaignResponseDto> })
  async findAll(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<PaginatedResponseDto<CampaignResponseDto>> {
    return this.campaignsService.findAll(req.user.tenantId, Number(page), Number(limit));
  }

  @Get('audiences')
  @ApiOperation({ summary: 'Get available audiences for campaign' })
  @ApiResponse({ status: 200, type: [AudienceResponseDto] })
  async getAudiences(@Request() req: any): Promise<AudienceResponseDto[]> {
    return this.campaignsService.getAudiences(req.user.tenantId);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get configured communication channels' })
  @ApiResponse({ status: 200, type: [ChannelConfigResponseDto] })
  async getChannels(@Request() req: any): Promise<ChannelConfigResponseDto[]> {
    return this.campaignsService.getChannels(req.user.tenantId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get approved Meta templates' })
  @ApiQuery({ name: 'channel', required: false, enum: ChannelType })
  @ApiResponse({ status: 200, type: [MetaTemplateResponseDto] })
  async getTemplates(
    @Request() req: any,
    @Query('channel') channel?: ChannelType,
  ): Promise<MetaTemplateResponseDto[]> {
    return this.campaignsService.getTemplates(req.user.tenantId, channel);
  }

  @Post('templates/refresh')
  @ApiOperation({ summary: 'Refresh templates from Meta API' })
  @ApiResponse({ status: 200, type: [MetaTemplateResponseDto] })
  async refreshTemplates(
    @Request() req: any,
    @Body('channel') channel: ChannelType,
  ): Promise<MetaTemplateResponseDto[]> {
    return this.campaignsService.refreshTemplates(req.user.tenantId, channel);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get campaign aggregate metrics and statistics' })
  async getStats(@Request() req: any) {
    return this.campaignsService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findOne(@Request() req: any, @Param('id') id: string): Promise<CampaignResponseDto> {
    return this.campaignsService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.update(req.user.tenantId, id, dto);
  }

  @Put(':id/audience')
  @ApiOperation({ summary: 'Select audience for campaign' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async selectAudience(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SelectAudienceDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.selectAudience(req.user.tenantId, id, dto);
  }

  @Put(':id/channel')
  @ApiOperation({ summary: 'Select channel for campaign' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async selectChannel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SelectChannelDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.selectChannel(req.user.tenantId, id, dto);
  }

  @Put(':id/template')
  @ApiOperation({ summary: 'Select Meta template for campaign' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async selectTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SelectTemplateDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.selectTemplate(req.user.tenantId, id, dto);
  }

  @Put(':id/configure-template')
  @ApiOperation({ summary: 'Configure template variable mappings' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async configureTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ConfigureTemplateDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.configureTemplate(req.user.tenantId, id, dto);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send test message' })
  @ApiResponse({ status: 200, description: 'Test message sent' })
  @HttpCode(HttpStatus.OK)
  async sendTest(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SendTestDto,
  ): Promise<{ messageId: string; status: string }> {
    return this.campaignsService.sendTest(req.user.tenantId, id, dto);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate campaign before launch' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateCampaign(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ valid: boolean; errors: string[] }> {
    return this.campaignsService.validateCampaign(req.user.tenantId, id);
  }

  @Post(':id/launch')
  @ApiOperation({ summary: 'Launch campaign' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async launchCampaign(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: LaunchCampaignDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.launchCampaign(req.user.tenantId, id, dto);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Schedule campaign for later' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async scheduleCampaign(
    @Request() req: any,
    @Param('id') id: string,
    @Body('scheduledAt') scheduledAt: string,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.scheduleCampaign(req.user.tenantId, id, new Date(scheduledAt));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiResponse({ status: 204, description: 'Campaign deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Request() req: any, @Param('id') id: string): Promise<void> {
    return this.campaignsService.delete(req.user.tenantId, id);
  }
}