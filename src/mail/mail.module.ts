import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import {
  AuthenticationTypeLogin,
  AuthenticationTypeOAuth2,
} from 'nodemailer/lib/smtp-connection';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../auth/password.service';
import { WalletService } from '../wallet/wallet.service';
import { HeliusService } from '../webhooks/helius/helius.service';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { DarkblockService } from 'src/candy-machine/darkblock.service';

type SupportedAuthType =
  | AuthenticationTypeLogin['type']
  | AuthenticationTypeOAuth2['type'];

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          transport: {
            port: 1025,
            service: configService.get<string>('MAIL_SERVICE'),
            auth: {
              type: configService.get<SupportedAuthType>('MAIL_AUTH_TYPE'),
              user: configService.get<string>('MAIL_USER'),
              clientId: configService.get<string>('MAIL_CLIENT_ID'),
              clientSecret: configService.get<string>('MAIL_CLIENT_SECRET'),
              refreshToken: configService.get<string>('MAIL_REFRESH_TOKEN'),
              pass: configService.get<string>('MAIL_PASS'),
            },
          },
          defaults: { from: configService.get<string>('MAIL_FROM') },
          template: {
            dir: __dirname + '/templates',
            adapter: new PugAdapter({
              inlineCssEnabled: true,
              inlineCssOptions: { removeHtmlSelectors: false, url: ' ' },
            }),
            options: { strict: true },
          },
          options: {
            partials: {
              dir: __dirname + '/templates/partials',
              options: { strict: true },
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    MailService,
    AuthService,
    JwtService,
    PasswordService,
    WalletService,
    HeliusService,
    CandyMachineService,
    WebSocketGateway,
    DarkblockService,
  ],
  exports: [MailService],
})
export class MailModule {}
