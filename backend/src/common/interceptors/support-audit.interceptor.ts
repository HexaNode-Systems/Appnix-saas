import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SupportAuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const actor = request.user;
    if (
      (actor?.role === 'SUPER_ADMIN' ||
        actor?.role === 'APP_ADMIN' ||
        actor?.role === 'RESELLER_ADMIN') &&
      actor?.impersonatedWorkspaceId
    ) {
      // Persist before dispatch so both successful and rejected support actions
      // remain auditable. No request body is stored, avoiding secret leakage.
      const action = `${request.method} ${request.route?.path || request.path}`;
      const endpoint = request.originalUrl || request.url;
      const ipAddress =
        (request.headers?.['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        request.ip ||
        request.socket?.remoteAddress ||
        '127.0.0.1';

      this.prisma.auditLog
        .create({
          data: {
            id: randomUUID(),
            superAdminId: actor.userId,
            targetWorkspaceId: actor.impersonatedWorkspaceId,
            action,
            endpoint,
            actorEmail: actor.email || undefined,
            ipAddress,
            details: { impersonation: true, actorRole: actor.role },
          },
        })
        .catch(() => undefined);
    }
    return next.handle();
  }
}
