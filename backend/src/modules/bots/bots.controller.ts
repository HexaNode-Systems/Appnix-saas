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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BotsService } from './bots.service';
import { CreateBotDto, UpdateBotDto } from './dto/bot.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Bots')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, SubscriptionGuard)
@Controller('bots')
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Get('folders')
  @ApiOperation({ summary: 'Get all folders with bot counts' })
  async getFolders(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.getFolders(tenantId);
  }

  @Post('folders')
  @ApiOperation({ summary: 'Create a new folder' })
  async createFolder(@CurrentUser() user: AuthUser, @Body('name') name: string) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.createFolder(tenantId, name);
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: 'Delete a folder' })
  async deleteFolder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.deleteFolder(tenantId, id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bots for tenant' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('folderId') folderId?: string,
    @Query('channel') channel?: string,
    @Query('search') search?: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.findAll(tenantId, { folderId, channel, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bot by ID' })
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new bot' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateBotDto) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update bot configuration' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBotDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.update(tenantId, id, dto);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test bot with simulated payload' })
  async testBot(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() testInput: any,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.testBot(tenantId, id, testInput);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish bot live version' })
  async publishBot(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('version') version?: number,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.publishBot(tenantId, id, version);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an existing bot' })
  async duplicateBot(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.duplicateBot(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bot' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.botsService.remove(tenantId, id);
  }
}
