import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@ApiTags('Billing')
@Controller(['billing', 'workspace/billing'])
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription tiers or reseller-scoped plans' })
  async getPlans(@Req() req: any) {
    let user: any = req.user;
    if (!user) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const secret =
            this.configService.get<string>('JWT_ACCESS_SECRET') ||
            this.configService.get<string>('JWT_SECRET') ||
            'default-access-secret';
          user = this.jwtService.verify(token, { secret });
        } catch {
          // invalid or expired token: proceed unauthenticated
        }
      }
    }
    return this.billingService.getPlans(user);
  }

  @Post('plans')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Create a new plan for the authenticated reseller' })
  async createPlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePlanDto,
  ) {
    const data = await this.billingService.createResellerPlan(user, dto);
    return { success: true, data, message: 'Plan created successfully' };
  }

  @Patch('plans/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Update an existing plan owned by authenticated reseller' })
  async updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    const data = await this.billingService.updateResellerPlan(user, id, dto);
    return { success: true, data, message: 'Plan updated successfully' };
  }

  @Delete('plans/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Delete or archive a plan owned by authenticated reseller' })
  async deletePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const data = await this.billingService.deleteResellerPlan(user, id);
    return { success: true, data, message: data.message };
  }



  @Get('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get active workspace subscription, cycle status, and quotas' })
  getSubscription(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId;
    return this.billingService.getSubscription(tenantId);
  }

  @Get('check')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Query subscription status by tenant ID' })
  checkStatus(@CurrentUser() user: AuthUser) {
    return this.billingService.getSubscription(user?.tenantId);
  }

  @Get('invoices')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Get tax invoice receipts history' })
  getInvoices(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId;
    return this.billingService.getInvoices(tenantId);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Initiate or upgrade subscription plan tier' })
  checkout(
    @CurrentUser() user: AuthUser,
    @Body('planId') planId: string,
  ) {
    throw new BadRequestException('Create and verify a Cashfree payment order before activating a subscription.');
  }

  @Get('trial-eligibility')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Check 7-day free trial eligibility and partner permissions for the workspace' })
  getTrialEligibility(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId;
    return this.billingService.getTrialEligibility(tenantId);
  }

  @Post('trial')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Redeem an eligible plan free trial for the workspace' })
  startTrial(
    @CurrentUser() user: AuthUser,
    @Body() body: { planId?: string },
  ) {
    return this.billingService.startTrial(user.tenantId, body?.planId || 'pro');
  }

  @Post('activate-payment')
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Activate subscription after verified server payment' })
  activatePayment(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      orderId: string;
      paymentId: string;
      planId: string;
      billingCycle?: 'monthly' | 'yearly';
      amount: number;
      paymentMethod?: string;
    },
  ) {
    const tenantId = user.tenantId;
    return this.billingService.activateSubscriptionFromPayment({
      tenantId,
      orderId: body.orderId,
      paymentId: body.paymentId,
      planId: body.planId,
      billingCycle: body.billingCycle,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
    });
  }

  @Post('admin/assign')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, SuperAdminGuard)
  @ApiOperation({ summary: 'Super Admin manual plan assignment to any workspace' })
  adminAssign(
    @CurrentUser() user: AuthUser,
    @Body() body: { tenantId: string; planId: string; days?: number },
  ) {
    return this.billingService.assignSubscriptionManually(body.tenantId, body.planId, body.days || 30);
  }

  @Post('cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @ApiOperation({ summary: 'Cancel current active subscription' })
  cancel(@CurrentUser() user: AuthUser) {
    const tenantId = user?.tenantId;
    return this.billingService.cancelSubscription(tenantId);
  }
}
