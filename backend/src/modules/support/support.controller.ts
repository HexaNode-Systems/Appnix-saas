import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Support')
@ApiBearerAuth()
@Controller(['support/tickets', 'workspace/support/tickets', 'support', 'workspace/support'])
@UseGuards(JwtAccessGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @ApiOperation({ summary: 'Raise a new support ticket' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    const tenantId = user?.tenantId || 'tenant_default';
    const userId = user?.userId || user?.id || '';
    return this.supportService.create(
      tenantId,
      userId,
      user?.email || 'admin@appnix.io',
      dto,
      user
    );
  }

  @Get()
  @ApiOperation({ summary: "Get all tickets for current tenant/user" })
  findAll(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.supportService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get support ticket details and conversation thread' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.supportService.findOne(tenantId, id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a support ticket' })
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReplyTicketDto
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    const userId = user?.userId || user?.id || '';
    return this.supportService.reply(
      tenantId,
      id,
      userId,
      user?.email || 'admin@appnix.io',
      user?.role || 'TENANT_ADMIN',
      dto,
      user
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status or priority' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto
  ) {
    const tenantId = user?.tenantId || 'tenant_default';
    return this.supportService.updateStatus(tenantId, id, dto);
  }
}
