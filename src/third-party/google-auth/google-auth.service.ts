import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { getGoogleOAuthClient } from './google-oauth.client';
import { differenceInSeconds } from 'date-fns';
import { GoogleUserPayload } from '../../auth/dto/authorization.dto';

@Injectable()
export class GoogleAuthService {
  async extractUserFromToken(accessToken: string): Promise<GoogleUserPayload> {
    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const { data: user } = await oauth2.userinfo.get();
    return {
      type: 'google',
      id: user.id,
      email: user.email,
      family_name: user.family_name,
      given_name: user.given_name,
      name: user.name,
    };
  }

  async validateAccessToken(accessToken: string): Promise<boolean> {
    const oauth2Client = getGoogleOAuthClient();
    try {
      const tokenInfo = await oauth2Client.getTokenInfo(accessToken);
      return (
        differenceInSeconds(new Date(tokenInfo.expiry_date), new Date()) > 0
      );
    } catch (error) {
      throw error;
    }
  }
}
