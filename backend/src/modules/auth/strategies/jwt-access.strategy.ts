import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          if (!req) return null;
          if (req.cookies) {
            return (
              req.cookies.appnix_admin_token ||
              req.cookies.appnix_superadmin_token ||
              req.cookies.appnix_access_token ||
              req.cookies.appnix_auth_token ||
              null
            );
          }
          if (typeof req.headers?.cookie === 'string') {
            const match = req.headers.cookie.match(
              /(?:^|;\s*)(?:appnix_admin_token|appnix_superadmin_token|appnix_access_token|appnix_auth_token)=([^;]+)/
            );
            if (match) return decodeURIComponent(match[1]);
          }
          return null;
        },
      ]),
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || configService.get<string>('JWT_SECRET') || 'default-access-secret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    // this becomes req.user in every guarded controller
    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
      orgPath: payload.orgPath || 'root',
      tier: payload.tier || 'END_CLIENT',
      permissions: payload.permissions || ['*'],
      impersonatedWorkspaceId: (payload as any).impersonatedWorkspaceId,
      isImpersonated: (payload as any).isImpersonated,
      impersonatorId: (payload as any).impersonatorId,
    };
  }
}
