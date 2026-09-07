import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
    };
  }
}