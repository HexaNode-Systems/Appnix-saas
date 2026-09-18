import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto, TicketPriority } from './dto/create-ticket.dto';
import { UpdateTicketDto, TicketStatus } from './dto/update-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Brevo REST API Transactional Email Dispatch Helper
   */
  async sendBrevoEmail(payload: {
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
  }) {
    const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
    if (!apiKey) {
      this.logger.warn('[Brevo] BREVO_API_KEY not configured. Skipping email dispatch.');
      return;
    }

    try {
      const senderEmail =
        process.env.SUPPORT_FROM_EMAIL ||
        process.env.BREVO_SENDER_EMAIL ||
        'support@appnix.co.in';
      const senderName = process.env.BREVO_SENDER_NAME || 'Appnix Support';

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: payload.to,
          subject: payload.subject,
          htmlContent: payload.htmlContent,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`[Brevo] Failed to dispatch email (${response.status}): ${errText}`);
      } else {
        this.logger.log(
          `[Brevo] Support email dispatched successfully to: ${payload.to.map((t) => t.email).join(', ')}`,
        );
      }
    } catch (error: any) {
      this.logger.error('[Brevo] Failed to dispatch email:', error?.message || error);
    }
  }

  async create(tenantId: string, userId: string, userEmail: string, dto: CreateTicketDto, authUser?: any) {
    const generatedTicketId = `SUP-${Math.floor(10000 + Math.random() * 90000)}`;

    let clientName = 'Customer';
    let clientEmail = userEmail || 'client@appnix.co.in';
    let workspaceName = 'Workspace';

    try {
      const [userRecord, tenantRecord] = await Promise.all([
        userId ? this.prisma.user.findUnique({ where: { id: userId } }) : null,
        tenantId ? this.prisma.tenant.findUnique({ where: { id: tenantId } }) : null,
      ]);

      if (userRecord) {
        clientName = userRecord.name || userRecord.email?.split('@')[0] || clientName;
        clientEmail = userRecord.email || clientEmail;
      }
      if (tenantRecord) {
        workspaceName = tenantRecord.name || workspaceName;
      }
    } catch (err: any) {
      this.logger.warn(`Could not fetch user/tenant profile for support email: ${err?.message}`);
    }

    const initialReplies = [
      {
        id: `r-${Date.now()}`,
        sender: 'customer',
        senderId: userId,
        senderName: clientName,
        senderRole: authUser?.role ? String(authUser.role).replace(/_/g, ' ') : 'Workspace Admin',
        message: dto.description,
        attachments: dto.attachments || [],
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      },
    ];

    const rawPriority = (dto.priority || 'Medium').toString().toLowerCase();
    const normalizedPriority =
      rawPriority === 'urgent'
        ? 'Urgent'
        : rawPriority === 'high'
        ? 'High'
        : rawPriority === 'low'
        ? 'Low'
        : 'Medium';

    const ticket = await this.prisma.supportTicket.create({
      data: {
        tenantId,
        ticketNumber: generatedTicketId,
        subject: dto.subject,
        category: dto.category || 'Technical Support',
        priority: normalizedPriority,
        status: 'Open',
        description: dto.description,
        assignedAgent: { name: 'Support Routing Engine', email: 'support@appnix.io' },
        attachments: dto.attachments || [],
        replies: initialReplies as any,
      },
    });

    // Email Templates for Client and Support Team
    const clientSubject = `[${ticket.ticketNumber}] Ticket Received: ${ticket.subject}`;
    const slaMap: Record<string, string> = {
      Urgent: 'within 1 hour',
      High: 'within 2–4 hours',
      Medium: 'within 8–12 hours',
      Low: 'within 24 hours',
    };
    const slaExpectation = slaMap[ticket.priority] || 'within 8–12 hours';

    const clientHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 20px;">Appnix Support Helpdesk</h2>
        </div>
        <p style="font-size: 15px; margin-bottom: 16px;">Hi <strong>${clientName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Thank you for reaching out to Appnix Support. We have received your request and an on-call specialist has been assigned to your case.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 130px;">Ticket Number:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #2563eb; font-family: monospace;">${ticket.ticketNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Subject:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${ticket.subject}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Category:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ticket.category}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Priority:</td>
              <td style="padding: 6px 0; color: #0f172a;"><strong>${ticket.priority}</strong> (Expected SLA: ${slaExpectation})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Status:</td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: 600;">${ticket.status}</td>
            </tr>
          </table>
        </div>
        <div style="margin-bottom: 24px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #0f172a;">Description:</h4>
          <p style="font-size: 13px; line-height: 1.5; color: #334155; background: #f1f5f9; padding: 12px; border-radius: 6px; white-space: pre-wrap; margin: 0;">${ticket.description}</p>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
          You can track progress and communicate directly with our engineers inside your
          <a href="https://app.appnix.co.in/workspace/support" style="color: #2563eb; text-decoration: underline;">Workspace Support Dashboard</a>.
        </p>
      </div>
    `;

    const adminAlertEmail = process.env.SUPPORT_ALERT_EMAIL || 'admin@appnix.co.in';
    const adminSubject = `[New Ticket Alert] ${ticket.ticketNumber} - ${ticket.subject}`;
    const adminHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="border-bottom: 2px solid #ef4444; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 18px;">⚠️ New Support Ticket Received</h2>
        </div>
        <p style="font-size: 14px; margin-bottom: 16px;">A new support ticket has been submitted on the client portal:</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;">Ticket Number:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #2563eb; font-family: monospace;">${ticket.ticketNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Client Name:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Client Email:</td>
              <td style="padding: 6px 0; color: #0f172a;"><a href="mailto:${clientEmail}">${clientEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Workspace / Tenant:</td>
              <td style="padding: 6px 0; color: #0f172a;"><strong>${workspaceName}</strong> (${tenantId})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Category:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ticket.category}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Priority:</td>
              <td style="padding: 6px 0; font-weight: bold; color: ${ticket.priority === 'Urgent' ? '#ef4444' : ticket.priority === 'High' ? '#f59e0b' : '#3b82f6'};">${ticket.priority}</td>
            </tr>
          </table>
        </div>
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #0f172a;">Description:</h4>
          <p style="font-size: 13px; line-height: 1.5; color: #334155; background: #f1f5f9; padding: 12px; border-radius: 6px; white-space: pre-wrap; margin: 0;">${ticket.description}</p>
        </div>
        <p style="font-size: 12px; color: #64748b; margin: 0;">
          Submitted at: ${new Date().toUTCString()}
        </p>
      </div>
    `;

    // Asynchronously dispatch Brevo emails without blocking ticket creation response
    Promise.all([
      this.sendBrevoEmail({
        to: [{ email: clientEmail, name: clientName }],
        subject: clientSubject,
        htmlContent: clientHtml,
      }),
      this.sendBrevoEmail({
        to: [{ email: adminAlertEmail, name: 'Support Admin' }],
        subject: adminSubject,
        htmlContent: adminHtml,
      }),
    ]).catch((err) => {
      this.logger.error('[Brevo] Error dispatching async ticket creation emails:', err);
    });

    return {
      success: true,
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.ticketNumber,
      tenantId: ticket.tenantId,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      description: ticket.description,
      assignedAgent: ticket.assignedAgent,
      attachments: ticket.attachments,
      replies: ticket.replies,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      message: 'Ticket created successfully. Confirmation email sent!',
    };
  }

  async findAll(tenantId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      ticketId: t.ticketNumber,
      tenantId: t.tenantId,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      description: t.description,
      assignedAgent: t.assignedAgent,
      attachments: t.attachments,
      replies: t.replies,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  async findOne(tenantId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        tenantId,
        OR: [{ id }, { ticketNumber: id }],
      },
    });

    if (!ticket) throw new NotFoundException('Support Ticket not found');

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.ticketNumber,
      tenantId: ticket.tenantId,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      description: ticket.description,
      assignedAgent: ticket.assignedAgent,
      attachments: ticket.attachments,
      replies: ticket.replies,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  async reply(
    tenantId: string,
    id: string,
    userId: string,
    userEmail: string,
    role: string,
    dto: ReplyTicketDto,
    authUser?: any,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        tenantId,
        OR: [{ id }, { ticketNumber: id }],
      },
    });

    if (!ticket) throw new NotFoundException('Support Ticket not found');

    let senderName = userEmail || 'Customer';
    try {
      if (userId) {
        const u = await this.prisma.user.findUnique({ where: { id: userId } });
        if (u?.name) senderName = u.name;
      }
    } catch {
      // fallback
    }

    const isSupportStaff = role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPPORT_AGENT';
    const existingReplies = (Array.isArray(ticket.replies) ? ticket.replies : []) as any[];

    const newReply = {
      id: `r-${Date.now()}`,
      sender: isSupportStaff ? 'agent' : 'customer',
      senderId: userId,
      senderName,
      senderRole: role ? String(role).replace(/_/g, ' ') : 'Workspace User',
      message: dto.message,
      attachments: dto.attachments || [],
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    const nextStatus = isSupportStaff ? 'Waiting for Customer' : 'In Progress';

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        replies: [...existingReplies, newReply] as any,
        status: nextStatus,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      id: updated.id,
      ticketNumber: updated.ticketNumber,
      ticketId: updated.ticketNumber,
      replies: updated.replies,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        tenantId,
        OR: [{ id }, { ticketNumber: id }],
      },
    });

    if (!ticket) throw new NotFoundException('Support Ticket not found');

    let normalizedStatus: string | undefined = undefined;
    if (dto.status) {
      const s = dto.status.toLowerCase();
      if (s.includes('progress')) normalizedStatus = 'In Progress';
      else if (s.includes('waiting')) normalizedStatus = 'Waiting for Customer';
      else if (s.includes('resolve')) normalizedStatus = 'Resolved';
      else if (s.includes('close')) normalizedStatus = 'Closed';
      else normalizedStatus = 'Open';
    }

    let normalizedPriority: string | undefined = undefined;
    if (dto.priority) {
      const p = dto.priority.toLowerCase();
      if (p === 'urgent') normalizedPriority = 'Urgent';
      else if (p === 'high') normalizedPriority = 'High';
      else if (p === 'low') normalizedPriority = 'Low';
      else normalizedPriority = 'Medium';
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        ...(normalizedStatus && { status: normalizedStatus }),
        ...(normalizedPriority && { priority: normalizedPriority }),
      },
    });

    return {
      success: true,
      id: updated.id,
      ticketNumber: updated.ticketNumber,
      ticketId: updated.ticketNumber,
      status: updated.status,
      priority: updated.priority,
      updatedAt: updated.updatedAt,
    };
  }
}
