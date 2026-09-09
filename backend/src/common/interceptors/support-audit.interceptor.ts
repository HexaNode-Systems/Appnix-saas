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
      (actor?.role === 'SUPER_ADMIN' || actor?.role === 'RESELLER_ADMIN') &&
      actor?.impersonatedWorkspaceId
    ) {
      // Persist before dispatch so both successful and rejected support actions
      // remain auditable. No request body is stored, avoiding secret leakage.
      const action = `${request.method} ${request.route?.path || request.path}`;
      const endpoint = request.originalUrl || request.url;
      void this.prisma.$executeRaw`
        INSERT INTO audit_logs (id, "superAdminId", "targetWorkspaceId", action, endpoint, "createdAt")
        VALUES (${randomUUID()}, ${actor.userId}, ${actor.impersonatedWorkspaceId}, ${action}, ${endpoint}, NOW())
      `.catch(() => undefined);
    }
    return next.handle();
  }
}
