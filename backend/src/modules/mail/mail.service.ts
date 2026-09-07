import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PartnerWelcomeEmailData,
  renderPartnerWelcomeEmail,
} from './templates/partner-welcome.template';

export { PartnerWelcomeEmailData };

export interface SendEmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string | undefined;
  private readonly senderName: string;
  private readonly senderEmail: string;
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.senderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'Appnix';
    this.senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || 'admin@appnix.info';

    if (!this.apiKey) {
      this.logger.warn(
        '⚠️ BREVO_API_KEY is not configured in environment. Emails will be logged to console in fallback mode.',
      );
    } else {
      this.logger.log(`✅ Brevo MailService initialized with sender: ${this.senderName} <${this.senderEmail}>`);
    }
  }

  /**
   * Core method to send transactional email via Brevo REST API v3
   */
  async sendMail(options: SendEmailOptions): Promise<{ messageId?: string; success: boolean }> {
    const { to, subject, htmlContent, textContent } = options;

    // Fallback in local development if no API key is configured
    if (!this.apiKey) {
      this.logger.warn(`[DEV EMAIL FALLBACK] To: ${to.map((r) => r.email).join(', ')} | Subject: "${subject}"`);
      return { success: true };
    }

    try {
      const response = await fetch(this.brevoApiUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: this.senderName,
            email: this.senderEmail,
          },
          to: to.map((recipient) => ({
            email: recipient.email,
            name: recipient.name || recipient.email.split('@')[0],
          })),
          subject,
          htmlContent,
          ...(textContent ? { textContent } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error(
          `Brevo API error (${response.status} ${response.statusText}): ${JSON.stringify(errorData)}`,
        );
        throw new Error(
          `Brevo email delivery failed: ${errorData.message || response.statusText || response.status}`,
        );
      }

      const data = (await response.json()) as { messageId?: string };
      this.logger.log(`📧 Email delivered via Brevo to ${to.map((r) => r.email).join(', ')} | Message ID: ${data.messageId}`);
      return { messageId: data.messageId, success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to.map((r) => r.email).join(', ')}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Sends a styled OTP email for authentication / password reset
   */
  async sendOtpEmail(toEmail: string, otp: string, purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION' = 'PASSWORD_RESET'): Promise<void> {
    const isReset = purpose === 'PASSWORD_RESET';
    const subject = isReset
      ? `${otp} is your Appnix password reset code`
      : `${otp} is your Appnix verification code`;
    const title = isReset ? 'Reset Your Password' : 'Verify Your Email';
    const desc = isReset
      ? 'We received a request to reset the password for your Appnix account. Enter the verification code below to proceed:'
      : 'Thank you for signing up for Appnix. Please verify your email address with the code below:';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0f19; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; border-bottom: 1px solid #1f2937;">
              <div style="display: inline-block; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                <span style="color: #6366f1;">App</span>nix
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 36px;">
              <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #ffffff; text-align: center;">${title}</h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 22px; color: #9ca3af; text-align: center;">
                ${desc}
              </p>

              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #818cf8; margin-bottom: 6px;">One-Time Verification Code</div>
                <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;">
                  ${otp}
                </div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 6px;">Expires in <strong>15 minutes</strong></div>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #1f2937; border-radius: 8px; padding: 14px; margin-top: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9ca3af;">
                  🔒 <strong>Security Tip:</strong> Never share this code with anyone. Appnix staff will never ask for your verification code. If you did not request this, please disregard this email.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #0d121f; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                &copy; ${new Date().getFullYear()} Appnix Technology. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await this.sendMail({
      to: [{ email: toEmail }],
      subject,
      htmlContent,
      textContent: `Your Appnix verification code is: ${otp}. It will expire in 15 minutes.`,
    });
  }

  /**
   * Sends a welcome email after registration
   */
  async sendWelcomeEmail(toEmail: string, name?: string, workspaceName?: string): Promise<void> {
    const displayName = name || toEmail.split('@')[0];
    const workspace = workspaceName || 'your new workspace';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<body style="background-color: #0b0f19; font-family: sans-serif; color: #f3f4f6; padding: 40px 10px;">
  <div style="max-width: 520px; margin: auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 36px;">
    <h2 style="color: #ffffff; margin-top: 0;">Welcome to Appnix, ${displayName}! 🚀</h2>
    <p style="color: #9ca3af; font-size: 14px; line-height: 22px;">
      Your workspace <strong>${workspace}</strong> has been successfully created. You can now start managing your team, contacts, and billing from your dashboard.
    </p>
    <div style="margin-top: 24px;">
      <a href="${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/dashboard" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendMail({
      to: [{ email: toEmail, name: displayName }],
      subject: `Welcome to Appnix, ${displayName}!`,
      htmlContent,
    });
  }

  /**
   * Sends a white-label partner welcome email containing admin credentials
   */
  async sendPartnerWelcomeEmail(
    data: PartnerWelcomeEmailData,
  ): Promise<{ messageId?: string; success: boolean }> {
    const { subject, htmlContent, textContent } = renderPartnerWelcomeEmail(data);

    this.logger.log(
      `📧 Dispatching White-Label Partner welcome email to ${data.adminEmail} for brand "${data.brandName}"...`,
    );

    try {
      return await this.sendMail({
        to: [{ email: data.adminEmail, name: data.adminName }],
        subject,
        htmlContent,
        textContent,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to send partner welcome email to ${data.adminEmail}: ${error.message}`,
        error.stack,
      );
      // Re-throw so caller knows if delivery failed or can handle appropriately
      throw error;
    }
  }
}

