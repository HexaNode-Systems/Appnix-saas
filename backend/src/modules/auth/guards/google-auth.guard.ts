import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor() {
    super({
      accessType: 'offline',
      prompt: 'select_account',
    });
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const origin = req.query?.origin || req.query?.returnUrl || req.query?.state;
    return {
      accessType: 'offline',
      prompt: 'select_account',
      ...(origin ? { state: String(origin) } : {}),
    };
  }
}
