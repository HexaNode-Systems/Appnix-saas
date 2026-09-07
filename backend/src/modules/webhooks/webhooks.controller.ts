import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';

@ApiTags('Webhooks')
@Controller(['webhooks', 'api/webhooks'])
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get(['meta', 'whatsapp', 'facebook'])
  @ApiOperation({ summary: 'Meta Webhook Challenge Verification (Hub.Mode & Hub.Verify_Token)' })
  verifyMetaWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.webhooksService.verifyMetaSubscription(mode, token, challenge);
  }

  @Post(['meta', 'whatsapp', 'facebook'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta Cloud API Inbound Messages & Delivery Status Receipts' })
  async handleMetaWebhook(
    @Body() payload: any,
    @Headers('x-hub-signature-256') signature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const rawBody = (req as any)?.rawBody || JSON.stringify(payload);
    return this.webhooksService.handleMetaWebhook(payload, rawBody, signature);
  }

  @Post(['meta/deauthorize', 'channels/meta/deauthorize'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta Facebook Login for Business Deauthorize Callback' })
  async handleMetaDeauthorize(
    @Body() body: any,
    @Req() req: Request,
  ) {
    const signedRequest = body?.signed_request || (req as any)?.query?.signed_request;
    return this.webhooksService.handleMetaDeauthorize(signedRequest, body);
  }

  @Post(['meta/data-deletion', 'channels/meta/data-deletion'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Meta Data Deletion Request Callback (GDPR / Platform Compliance)' })
  async handleMetaDataDeletion(
    @Body() body: any,
    @Req() req: Request,
  ) {
    const signedRequest = body?.signed_request || (req as any)?.query?.signed_request;
    return this.webhooksService.handleMetaDataDeletion(signedRequest, body);
  }

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay Auto-Recharge Payment Event Webhook' })
  async handleRazorpayWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    return this.webhooksService.handleRazorpayWebhook(payload, signature);
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe Invoice & Subscription Webhook' })
  async handleStripeWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.webhooksService.handleStripeWebhook(payload, signature);
  }
}
