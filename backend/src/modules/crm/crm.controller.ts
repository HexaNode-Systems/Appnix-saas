import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CrmContactsService } from './crm.service';
import {
  CreateCrmContactDto,
  UpdateCrmContactDto,
  ValidateCsvDto,
  BulkImportDto,
} from './dto/crm-contact.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@ApiTags('CRM Contacts')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, SubscriptionGuard)
@Controller(['contacts', 'crm-contacts', 'crm/contacts'])
export class CrmContactsController {
  constructor(private crmContactsService: CrmContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new CRM contact' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCrmContactDto) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contacts for current tenant' })
  findAll(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.findAll(tenantId);
  }

  @Post('validate-csv')
  @ApiOperation({ summary: 'Validate CSV rows and detect format/duplicate issues' })
  validateCsv(@CurrentUser() user: AuthUser, @Body() dto: ValidateCsvDto) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.validateCsv(tenantId, dto);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Execute bulk contact import with duplicate handling strategy' })
  bulkImport(@CurrentUser() user: AuthUser, @Body() dto: BulkImportDto) {
    const tenantId = user?.tenantId || 'tenant_default';
    const userId = user?.userId || user?.email || 'Admin';
    return this.crmContactsService.bulkImport(tenantId, userId, dto);
  }

  @Get('import-history')
  @ApiOperation({ summary: 'Get historical contact import batch records' })
  getImportHistory(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.getImportHistory(tenantId);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete contacts by ID array' })
  bulkDelete(@CurrentUser() user: AuthUser, @Body('ids') ids: string[]) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.bulkDelete(tenantId, ids);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export contacts list' })
  async exportContacts(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    const contacts = await this.crmContactsService.findAll(tenantId);
    return {
      success: true,
      data: contacts,
    };
  }

  @Get('segments')
  @ApiOperation({ summary: 'Get CRM audience segments for current tenant' })
  getSegments(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.getSegments(tenantId);
  }

  @Post('segments')
  @ApiOperation({ summary: 'Create a new CRM audience segment' })
  createSegment(
    @CurrentUser() user: AuthUser,
    @Body() dto: { name: string; description?: string; tag?: string; superFieldKey?: string; superFieldValue?: string; contactIds?: string[] },
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.createSegment(tenantId, dto);
  }

  @Delete('segments/:id')
  @ApiOperation({ summary: 'Delete a CRM audience segment' })
  deleteSegment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.deleteSegment(tenantId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single contact details' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact details' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCrmContactDto,
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.crmContactsService.remove(tenantId, id);
  }
}