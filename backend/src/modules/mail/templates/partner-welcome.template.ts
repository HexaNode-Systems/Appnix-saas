/**
 * Reusable Email Template for White-Label Partner Provisioning & Credentials
 */

export interface PartnerWelcomeEmailData {
  brandName: string;
  adminName: string;
  adminEmail: string;
  temporaryPassword: string;
  loginUrl: string;
  customDomain?: string;
  primaryColor?: string;
  logoUrl?: string;
  supportEmail?: string;
}

export function renderPartnerWelcomeEmail(data: PartnerWelcomeEmailData): {
  subject: string;
  htmlContent: string;
  textContent: string;
} {
  const {
    brandName,
    adminName,
    adminEmail,
    temporaryPassword,
    loginUrl,
    customDomain,
    primaryColor = '#f59e0b',
    logoUrl,
    supportEmail = 'support@appnix.co.in',
  } = data;

  const currentYear = new Date().getFullYear();
  const subject = `Welcome to ${brandName} — Your Admin Console Credentials`;

  // Sanitize primary color or use safe fallback
  const accentColor = /^#[0-9a-fA-F]{3,8}$/.test(primaryColor) ? primaryColor : '#f59e0b';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .responsive-table { width: 100% !important; }
      .mobile-padding { padding: 24px 20px !important; }
      .mobile-btn { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #090d16; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);" class="responsive-table">
          
          <!-- Top Accent Banner -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, ${accentColor}, #fbbf24, #6366f1); font-size: 0px; line-height: 0px;">&nbsp;</td>
          </tr>

          <!-- Header / Brand Logo -->
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: center; border-bottom: 1px solid #1f2937;" class="mobile-padding">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="${brandName}" style="max-height: 44px; max-width: 220px; display: inline-block; object-fit: contain;" />`
                  : `<div style="display: inline-block; padding: 8px 18px; border-radius: 10px; background-color: #1a2234; border: 1px solid #2d3748;">
                      <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                        ${brandName}
                      </span>
                    </div>`
              }
              <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-top: 10px;">
                Partner Administration Console
              </div>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;" class="mobile-padding">
              <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                Welcome, ${adminName}! 👋
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 24px; color: #9ca3af;">
                Your white-label workspace for <strong style="color: #ffffff;">${brandName}</strong> has been successfully provisioned on the platform. You have been designated as the primary <strong style="color: #ffffff;">Reseller Administrator</strong> with complete access to manage clients, wholesale billing, and messaging channels.
              </p>

              <!-- Credentials Card -->
              <div style="background-color: #0b1120; border: 1px solid #1e293b; border-left: 4px solid ${accentColor}; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${accentColor}; margin-bottom: 16px;">
                  🔐 Your Administrator Credentials
                </div>

                <!-- Admin URL -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                  <tr>
                    <td width="35%" style="font-size: 12px; font-weight: 600; color: #9ca3af; padding: 6px 0; vertical-align: top;">
                      Admin Console URL:
                    </td>
                    <td width="65%" style="font-size: 13px; font-weight: 600; padding: 6px 0; word-break: break-all;">
                      <a href="${loginUrl}" target="_blank" style="color: #60a5fa; text-decoration: none;">
                        ${loginUrl}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td width="35%" style="font-size: 12px; font-weight: 600; color: #9ca3af; padding: 6px 0; vertical-align: top;">
                      Login Email:
                    </td>
                    <td width="65%" style="font-size: 13px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-weight: 600; color: #ffffff; padding: 6px 0;">
                      ${adminEmail}
                    </td>
                  </tr>
                  <tr>
                    <td width="35%" style="font-size: 12px; font-weight: 600; color: #9ca3af; padding: 6px 0; vertical-align: top;">
                      Temporary Password:
                    </td>
                    <td width="65%" style="padding: 6px 0;">
                      <span style="display: inline-block; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 14px; font-weight: 700; letter-spacing: 1px; color: #ffffff; background-color: #1e293b; border: 1px solid #334155; padding: 6px 12px; border-radius: 6px;">
                        ${temporaryPassword}
                      </span>
                    </td>
                  </tr>
                </table>

                <div style="font-size: 11px; color: #64748b; line-height: 16px; margin-top: 12px; border-top: 1px dashed #1e293b; padding-top: 12px;">
                  ⚠️ <em>Please change your temporary password immediately upon your initial login.</em>
                </div>
              </div>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="background: ${accentColor}; color: #000000; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(0,0,0,0.4); text-transform: uppercase; letter-spacing: 0.5px;" class="mobile-btn">
                      Log In to Admin Console &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              ${
                customDomain
                  ? `
              <!-- Custom Domain Box -->
              <div style="background-color: #131d31; border: 1px solid #23324d; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #93c5fd; margin-bottom: 6px;">
                  🌐 Custom Domain Configuration
                </div>
                <p style="margin: 0; font-size: 12px; line-height: 20px; color: #cbd5e1;">
                  Your dedicated white-label portal domain is set to <strong style="color: #ffffff;">${customDomain}</strong>. Once your DNS CNAME points to <code style="background-color: #0b1120; padding: 2px 6px; border-radius: 4px; color: #60a5fa;">cname.appnix.co.in</code>, your clients will access your platform directly from your branded domain.
                </p>
              </div>
              `
                  : ''
              }

              <!-- Getting Started Steps -->
              <div style="margin-top: 24px; border-top: 1px solid #1f2937; padding-top: 24px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; margin-bottom: 12px;">
                  🚀 Recommended Next Steps
                </div>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="24" style="vertical-align: top; font-size: 13px; color: ${accentColor}; font-weight: bold; padding-bottom: 8px;">1.</td>
                    <td style="font-size: 13px; line-height: 20px; color: #9ca3af; padding-bottom: 8px;">
                      Sign in using your temporary password and update it in your profile settings.
                    </td>
                  </tr>
                  <tr>
                    <td width="24" style="vertical-align: top; font-size: 13px; color: ${accentColor}; font-weight: bold; padding-bottom: 8px;">2.</td>
                    <td style="font-size: 13px; line-height: 20px; color: #9ca3af; padding-bottom: 8px;">
                      Review your wholesale plan, client quotas, and commission economics.
                    </td>
                  </tr>
                  <tr>
                    <td width="24" style="vertical-align: top; font-size: 13px; color: ${accentColor}; font-weight: bold; padding-bottom: 8px;">3.</td>
                    <td style="font-size: 13px; line-height: 20px; color: #9ca3af; padding-bottom: 8px;">
                      Begin onboarding your direct business clients and configuring messaging channels.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #1a1612; border: 1px solid #452b12; border-radius: 8px; padding: 14px 18px; margin-top: 28px;">
                <p style="margin: 0; font-size: 11px; line-height: 18px; color: #d97706;">
                  🔒 <strong>Confidentiality Notice:</strong> This email contains sensitive credentials intended solely for the authorized administrator of <strong>${brandName}</strong>. Do not forward or disclose these credentials to anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #0d121f; border-top: 1px solid #1f2937; text-align: center;" class="mobile-padding">
              <p style="margin: 0 0 6px; font-size: 12px; color: #6b7280;">
                &copy; ${currentYear} ${brandName}. Powered by Appnix Platform Engine.
              </p>
              <p style="margin: 0; font-size: 11px; color: #4b5563;">
                Need assistance? Contact your platform representative or write to <a href="mailto:${supportEmail}" style="color: #6b7280; text-decoration: underline;">${supportEmail}</a>.
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

  const textContent = `
Welcome to ${brandName}!

Hello ${adminName},

Your white-label partner workspace for ${brandName} has been successfully provisioned on the platform.
You have been designated as the primary Reseller Administrator.

Your Administrator Credentials:
--------------------------------------------------
Admin Console URL:   ${loginUrl}
Admin Login Email:   ${adminEmail}
Temporary Password:  ${temporaryPassword}
--------------------------------------------------

* Please log in and change your temporary password immediately upon your first visit.

${customDomain ? `Custom Domain:\nYour white-label portal domain is: ${customDomain}\nPoint your DNS CNAME to cname.appnix.co.in to activate.\n` : ''}
Recommended Next Steps:
1. Log into your Admin Console at: ${loginUrl}
2. Update your temporary password in Account Settings.
3. Review your wholesale plan and client quotas.
4. Begin onboarding clients and configuring messaging channels.

Confidentiality Notice:
This email contains confidential access credentials for ${brandName}. Do not disclose or share this message.

(c) ${currentYear} ${brandName}. Powered by Appnix Technology.
Support: ${supportEmail}
`.trim();

  return {
    subject,
    htmlContent,
    textContent,
  };
}
