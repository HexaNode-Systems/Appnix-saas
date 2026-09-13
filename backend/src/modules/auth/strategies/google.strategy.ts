import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name?: string;
  avatar?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'UNCONFIGURED_GOOGLE_CLIENT_ID',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'UNCONFIGURED_GOOGLE_CLIENT_SECRET',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        (process.env.NODE_ENV === 'production'
          ? 'https://api.appnix.co.in/api/v1/auth/google/callback'
          : 'http://localhost:4000/api/v1/auth/google/callback'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos, displayName } = profile;
    const user: GoogleUserProfile = {
      googleId: id,
      email: emails && emails.length > 0 ? emails[0].value : '',
      name: name ? `${name.givenName || ''} ${name.familyName || ''}`.trim() : displayName,
      avatar: photos && photos.length > 0 ? photos[0].value : undefined,
    };
    done(null, user);
  }
}
