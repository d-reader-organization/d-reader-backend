import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Creator, User } from '@prisma/client';
import config from '../configs/config';

const logError = (template: string, recipient: string, e: any) => {
  console.error(`Failed to send ${template} email to ${recipient}`);
  console.error('ERROR: ', e);
};

const SUBSCRIBE_TO_NEWSLETTER = 'subscribedToNewsletter';
const UNSUBSCRIBED_FROM_NEWSLETTER = 'unsubscribedFromNewsletter';
const USER_REGISTERED = 'userRegistered';
const USER_PASSWORD_RESET = 'userPasswordReset';
const USER_EMAIL_VERIFICATION = 'userEmailVerification';
const CREATOR_REGISTERED = 'creatorRegistered';
const CREATOR_PASSWORD_RESET = 'creatorPasswordReset';
const CREATOR_EMAIL_VERIFICATION = 'creatorEmailVerification';

@Injectable()
export class MailService {
  private readonly apiUrl: string;
  private readonly dReaderUrl: string;
  private readonly dPublisherUrl: string;

  constructor(private readonly mailerService: MailerService) {
    this.apiUrl = config().nest.apiUrl;
    this.dReaderUrl = config().client.dReaderUrl;
    this.dPublisherUrl = config().client.dPublisherUrl;
  }

  async subscribedToNewsletter(email: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '✅ Newsletter subscription',
        template: SUBSCRIBE_TO_NEWSLETTER,
        context: {
          apiUrl: this.apiUrl,
          actionUrl: this.newsletterUrl(email),
        },
      });
    } catch (e) {
      logError(SUBSCRIBE_TO_NEWSLETTER, email, e);
    }
  }

  async unsubscribedFromNewsletter(email: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '💀 Newsletter is no more!',
        template: UNSUBSCRIBED_FROM_NEWSLETTER,
        context: {
          apiUrl: this.apiUrl,
          actionUrl: this.newsletterUrl(email),
        },
      });
    } catch (e) {
      logError(UNSUBSCRIBED_FROM_NEWSLETTER, email, e);
    }
  }

  async userRegistered(user: User, verificationToken: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '🎉 Account created!',
        template: USER_REGISTERED,
        context: {
          name: user.name,
          apiUrl: this.apiUrl,
          actionUrl: this.verificationUrl(this.dReaderUrl, verificationToken),
        },
      });
    } catch (e) {
      logError(USER_REGISTERED, user.email, e);
    }
  }

  async userPasswordReset(user: User, newPassword: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '🔐 Password reset!',
        template: USER_PASSWORD_RESET,
        context: {
          name: user.name,
          newPassword,
          apiUrl: this.apiUrl,
          actionUrl: this.loginUrl(this.dReaderUrl),
        },
      });
    } catch (e) {
      logError(USER_PASSWORD_RESET, user.email, e);
      throw new InternalServerErrorException(
        'Unable to send "password reset" email',
      );
    }
  }

  async requestUserEmailVerification(user: User, verificationToken: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '🕵️‍♂️ e-mail verification!',
        template: USER_EMAIL_VERIFICATION,
        context: {
          name: user.name,
          apiUrl: this.apiUrl,
          actionUrl: this.verificationUrl(this.dReaderUrl, verificationToken),
        },
      });
    } catch (e) {
      logError(USER_EMAIL_VERIFICATION, user.email, e);
      throw new InternalServerErrorException(
        'Unable to send "e-mail verification" email',
      );
    }
  }

  async creatorRegistered(creator: Creator, verificationToken: string) {
    try {
      await this.mailerService.sendMail({
        to: creator.email,
        subject: '🎉 Account created!',
        template: CREATOR_REGISTERED,
        context: {
          name: creator.name,
          apiUrl: this.apiUrl,
          actionUrl: this.verificationUrl(
            this.dPublisherUrl,
            verificationToken,
          ),
        },
      });
    } catch (e) {
      logError(CREATOR_REGISTERED, creator.email, e);
    }
  }

  async creatorPasswordReset(creator: Creator, newPassword: string) {
    try {
      await this.mailerService.sendMail({
        to: creator.email,
        subject: '🔐 Password reset!',
        template: CREATOR_PASSWORD_RESET,
        context: {
          name: creator.name,
          newPassword,
          apiUrl: this.apiUrl,
          actionUrl: this.loginUrl(this.dPublisherUrl),
        },
      });
    } catch (e) {
      logError(CREATOR_PASSWORD_RESET, creator.email, e);
      throw new InternalServerErrorException(
        'Unable to send "password reset" email',
      );
    }
  }

  async requestCreatorEmailVerification(
    creator: Creator,
    verificationToken: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: creator.email,
        subject: '🕵️‍♂️ e-mail verification!',
        template: CREATOR_EMAIL_VERIFICATION,
        context: {
          name: creator.name,
          apiUrl: this.apiUrl,
          actionUrl: this.verificationUrl(
            this.dPublisherUrl,
            verificationToken,
          ),
        },
      });
    } catch (e) {
      logError(CREATOR_EMAIL_VERIFICATION, creator.email, e);
      throw new InternalServerErrorException(
        'Unable to send "e-mail verification" email',
      );
    }
  }

  newsletterUrl(email: string) {
    return `${this.dReaderUrl}/newsletter/${email}`;
  }

  verificationUrl(clientUrl: string, verificationToken: string) {
    return `${clientUrl}/verify-email/${verificationToken}`;
  }

  loginUrl(clientUrl: string) {
    return `${clientUrl}/login`;
  }
}
