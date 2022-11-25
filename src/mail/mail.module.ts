import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          // transport: 'smtps://user@domain.com:pass@smtp.domain.com',
          transport: {
            service: configService.get<string>('MAIL_SERVICE'),
            host: configService.get<string>('MAIL_HOST'),
            port: parseInt(configService.get<string>('MAIL_PORT')),
            ignoreTLS: false,
            secure: false,
            auth: {
              user: configService.get<string>('MAIL_USER'),
              pass: configService.get<string>('MAIL_PASS'),
            },
          },
          defaults: {
            from: `"dReader - no reply" <${configService.get<string>(
              'MAIL_FROM',
            )}`,
          },
          template: {
            dir: __dirname + '/templates',
            adapter: new PugAdapter(),
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
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
