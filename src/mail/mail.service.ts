import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Creator, User } from '@prisma/client';
import config from '../configs/config';
import { AuthService } from '../auth/auth.service';

// To consider:
// send reports for critical backend errors to errors@dreader.io
// send notifications to important@dreader.io when someone creates a comic / comic issue

const logError = (template: string, recipient: string, e: any) => {
  console.error(`Failed to send ${template} email to ${recipient}`);
  console.error('ERROR: ', e);
};

const SUBSCRIBE_TO_NEWSLETTER = 'subscribedToNewsletter';
const UNSUBSCRIBED_FROM_NEWSLETTER = 'unsubscribedFromNewsletter';
const USER_REGISTERED = 'userRegistered';
const USER_SCHEDULED_FOR_DELETION = 'userScheduledForDeletion';
const USER_DELETED = 'userDeleted';
const USER_PASSWORD_RESET = 'userPasswordReset';
const USER_PASSWORD_RESET_REQUESTED = 'userPasswordResetRequested';
const BUMP_USER_WITH_EMAIL_VERIFICATION = 'bumpUserWithEmailVerification';
const USER_EMAIL_VERIFICATION = 'userEmailVerification';
const CREATOR_REGISTERED = 'creatorRegistered';
const CREATOR_SCHEDULED_FOR_DELETION = 'creatorScheduledForDeletion';
const CREATOR_DELETED = 'creatorDeleted';
const CREATOR_PASSWORD_RESET = 'creatorPasswordReset';
const BUMP_CREATOR_WITH_EMAIL_VERIFICATION = 'bumpCreatorWithEmailVerification';
const CREATOR_EMAIL_VERIFICATION = 'creatorEmailVerification';
const REQUEST_EMAIL_CHANGE = 'requestEmailChange';
const SUCCESS_EMAIL_CHANGE = 'successEmailChange';

@Injectable()
export class MailService {
  private readonly apiUrl: string;
  private readonly dReaderUrl: string;
  private readonly dPublisherUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly authService: AuthService,
  ) {
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

  async userRegistered(user: User) {
    const verificationToken = this.authService.signEmail(user.email);

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

  async userScheduledForDeletion(user: User) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '🫂 Account scheduled for deletion!',
        template: USER_SCHEDULED_FOR_DELETION,
        context: {
          name: user.name,
          apiUrl: this.apiUrl,
        },
      });
    } catch (e) {
      logError(USER_SCHEDULED_FOR_DELETION, user.email, e);
    }
  }

  async userDeleted(user: User) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '👋 Account deleted!',
        template: USER_DELETED,
        context: {
          name: user.name,
          apiUrl: this.apiUrl,
        },
      });
    } catch (e) {
      logError(USER_DELETED, user.email, e);
    }
  }

  async requestUserPasswordReset(user: User, verificationToken: string) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '🔐 Password reset requested!',
        template: USER_PASSWORD_RESET_REQUESTED,
        context: {
          name: user.name,
          apiUrl: this.apiUrl,
          actionUrl: this.resetPasswordUrl(this.dReaderUrl, verificationToken),
        },
      });
    } catch (e) {
      logError(USER_PASSWORD_RESET_REQUESTED, user.email, e);
      throw new InternalServerErrorException(
        'Unable to send "password reset requested" email',
      );
    }
  }

  async userPasswordReset(user: User) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '🔐 Password reset!',
        template: USER_PASSWORD_RESET,
        context: {
          name: user.name,
          apiUrl: this.apiUrl,
        },
      });
    } catch (e) {
      logError(USER_PASSWORD_RESET, user.email, e);
      throw new InternalServerErrorException(
        'Unable to send "password reset" email',
      );
    }
  }

  async bumpUserWithEmailVerification(user: User) {
    const verificationToken = this.authService.signEmail(user.email);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '🕵️‍♂️ e-mail verification!',
        template: BUMP_USER_WITH_EMAIL_VERIFICATION,
        context: {
          name: user.name,
          apiUrl: this.apiUrl,
          actionUrl: this.verificationUrl(this.dReaderUrl, verificationToken),
        },
      });
    } catch (e) {
      logError(BUMP_USER_WITH_EMAIL_VERIFICATION, user.email, e);
      throw new InternalServerErrorException(
        'Unable to send "bump e-mail verification" email',
      );
    }
  }

  async requestUserEmailVerification(user: User) {
    const verificationToken = this.authService.signEmail(user.email);

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

  async requestUserEmailChange({
    newEmail,
    userId,
  }: {
    newEmail: string;
    userId: number;
  }) {
    const verificationToken = this.authService.generateTokenForEmailChange({
      email: newEmail,
      userId,
    });
    try {
      await this.mailerService.sendMail({
        to: newEmail,
        subject: '🕵️‍♂️ change e-mail verification!',
        template: REQUEST_EMAIL_CHANGE,
        context: {
          apiUrl: this.apiUrl,
          actionUrl: this.verifyUpdatedEmailUrl(
            this.dReaderUrl,
            verificationToken,
          ),
        },
      });
    } catch (e) {
      logError(REQUEST_EMAIL_CHANGE, newEmail, e);
      throw new InternalServerErrorException(
        'Unable to send "email change" email',
      );
    }
  }

  async emailChangeSuccess(email: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '🕵️‍♂️ Successfully changed email',
        template: SUCCESS_EMAIL_CHANGE,
        context: {
          apiUrl: this.apiUrl,
        },
      });
    } catch (e) {
      logError(SUCCESS_EMAIL_CHANGE, email, e);
      throw new InternalServerErrorException(
        'Unable to send "success email change" email',
      );
    }
  }

  async creatorRegistered(creator: Creator) {
    const verificationToken = this.authService.signEmail(creator.email);

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

  async creatorScheduledForDeletion(creator: Creator) {
    try {
      await this.mailerService.sendMail({
        to: creator.email,
        subject: '🫂 Account scheduled for deletion!',
        template: CREATOR_SCHEDULED_FOR_DELETION,
        context: {
          name: creator.name,
          apiUrl: this.apiUrl,
        },
      });
    } catch (e) {
      logError(CREATOR_SCHEDULED_FOR_DELETION, creator.email, e);
    }
  }

  async creatorDeleted(creator: Creator) {
    try {
      await this.mailerService.sendMail({
        to: creator.email,
        subject: '👋 Account deleted!',
        template: CREATOR_DELETED,
        context: {
          name: creator.name,
          apiUrl: this.apiUrl,
        },
      });
    } catch (e) {
      logError(CREATOR_DELETED, creator.email, e);
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

  async bumpCreatorWithEmailVerification(creator: Creator) {
    const verificationToken = this.authService.signEmail(creator.email);

    try {
      await this.mailerService.sendMail({
        to: creator.email,
        subject: '🕵️‍♂️ e-mail verification!',
        template: BUMP_CREATOR_WITH_EMAIL_VERIFICATION,
        context: {
          name: creator.name,
          apiUrl: this.apiUrl,
          actionUrl: this.verificationUrl(this.dReaderUrl, verificationToken),
        },
      });
    } catch (e) {
      logError(BUMP_CREATOR_WITH_EMAIL_VERIFICATION, creator.email, e);
      throw new InternalServerErrorException(
        'Unable to send "bump e-mail verification" email',
      );
    }
  }

  async requestCreatorEmailVerification(creator: Creator) {
    const verificationToken = this.authService.signEmail(creator.email);

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

  resetPasswordUrl(clientUrl: string, verificationToken: string): string {
    return `${clientUrl}/reset-password/${verificationToken}`;
  }

  loginUrl(clientUrl: string) {
    return `${clientUrl}/login`;
  }

  verifyUpdatedEmailUrl(clientUrl: string, verificationToken: string) {
    return `${clientUrl}/verify-updated-email/${verificationToken}`;
  }
}
