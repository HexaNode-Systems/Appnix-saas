import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UnlockWorkflowDto } from './dto/unlock-workflow.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Automations & Workflows')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, SubscriptionGuard)
@Controller(['automations/workflows', 'api/automations/workflows', 'automations'])
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new visual workflow' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createWorkflow(
    @Body() dto: CreateWorkflowDto,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.createWorkflow(tenantId, dto);
  }

  @Post('unlock')
  @ApiOperation({ summary: 'Unlock premium workflow using license key' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async unlockWorkflow(
    @Body() dto: UnlockWorkflowDto,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.unlockWorkflow(tenantId, dto.licenseKey);
  }

  @Get('quota')
  @ApiOperation({ summary: 'Get workspace workflow allowance quota' })
  async getQuota(@CurrentUser() user?: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.getQuota(tenantId);
  }

  @Get('folders')
  @ApiOperation({ summary: 'Get folders' })
  async getFolders(@CurrentUser() user?: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.getFolders(tenantId);
  }

  @Post('folders')
  @ApiOperation({ summary: 'Create a new folder' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createFolder(
    @Body() dto: CreateFolderDto,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.createFolder(tenantId, dto.name);
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: 'Delete a folder' })
  async deleteFolder(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.deleteFolder(tenantId, id);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get automations analytics, telemetry and KPI metrics' })
  async getAnalytics(
    @Query('dateRange') dateRange?: string,
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.getAnalytics(tenantId, dateRange, workflowId, status);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get pre-built workflow templates' })
  async getTemplates(
    @Query('category') category?: string,
    @Query('channel') channel?: string,
  ) {
    return this.workflowsService.getTemplates(category, channel);
  }

  @Post('templates/:id/clone')
  @ApiOperation({ summary: 'Clone workflow template into active workspace' })
  async cloneTemplate(
    @Param('id') id: string,
    @Body('customTitle') customTitle?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.cloneTemplate(tenantId, id, customTitle);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get execution and modification history for a workflow' })
  async getWorkflowHistory(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.getWorkflowHistory(tenantId, id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Run a test execution of workflow' })
  async executeWorkflow(
    @Param('id') id: string,
    @Body() body?: any,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.executeWorkflow(tenantId, id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single workflow canvas nodes & edges' })
  async getWorkflowById(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.getWorkflowById(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Save/update workflow canvas state' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateWorkflow(
    @Param('id') id: string,
    @Body() payload: UpdateWorkflowDto,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.updateWorkflow(tenantId, id, payload);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update workflow state' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async patchWorkflow(
    @Param('id') id: string,
    @Body() payload: UpdateWorkflowDto,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.updateWorkflow(tenantId, id, payload);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle workflow active state' })
  async toggleWorkflow(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.toggleWorkflow(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  async deleteWorkflow(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.workflowsService.deleteWorkflow(tenantId, id);
  }

  @Get()
  @ApiOperation({ summary: 'List all workflows for workspace' })
  async getWorkflows(
    @Query('folderId') folderId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.workflowsService.getWorkflows(tenantId, folderId, pageNum, limitNum, search);
  }
}
