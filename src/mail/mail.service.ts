import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Creator, User } from '@prisma/client';
import config from '../configs/config';

const logError = (template: string, recipient: string, e: any) => {
  console.error(`Failed to send ${template} email to ${recipient}: ${e}`);
};

const SUBSCRIBE_TO_NEWSLETTER = 'subscribedToNewsletter';
const USER_REGISTERED = 'userRegistered';
const USER_PASSWORD_RESET = 'userPasswordReset';
const USER_EMAIL_VERIFICATION = 'userEmailVerification';
const CREATOR_REGISTERED = 'creatorRegistered';
const CREATOR_PASSWORD_RESET = 'creatorPasswordReset';
const CREATOR_EMAIL_VERIFICATION = 'creatorEmailVerification';
const UNSUBSCRIBED_FROM_NEWSLETTER = 'unsubscribedFromNewsletter';

// TODO: prettify email styles and add more meaningful content

@Injectable()
export class MailService {
  private readonly api: string;

  constructor(private readonly mailerService: MailerService) {
    this.api = config().nest.api;
  }

  async subscribedToNewsletter(recipient: string) {
    try {
      await this.mailerService.sendMail({
        to: recipient,
        subject: 'Newsletter subscription',
        template: SUBSCRIBE_TO_NEWSLETTER,
      });
    } catch (e) {
      logError(SUBSCRIBE_TO_NEWSLETTER, recipient, e);
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
          verificationUrl: this.verificationUrl(verificationToken, 'user'),
          api: this.api,
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
          api: this.api,
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
          verificationUrl: this.verificationUrl(verificationToken, 'user'),
          api: this.api,
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
          verificationUrl: this.verificationUrl(verificationToken, 'creator'),
          api: this.api,
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
          api: this.api,
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
          verificationUrl: this.verificationUrl(verificationToken, 'creator'),
          api: this.api,
        },
      });
    } catch (e) {
      logError(CREATOR_EMAIL_VERIFICATION, creator.email, e);
      throw new InternalServerErrorException(
        'Unable to send "e-mail verification" email',
      );
    }
  }

  async unsubscribedFromNewsletter(email: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '💀 Newsletter is no more!',
        template: UNSUBSCRIBED_FROM_NEWSLETTER,
        context: {
          api: this.api,
        },
      });
    } catch (e) {
      logError(UNSUBSCRIBED_FROM_NEWSLETTER, email, e);
    }
  }

  verificationUrl(verificationToken: string, type: 'user' | 'creator') {
    return `${this.api}/${type}/verify-email/${verificationToken}`;
  }
}
