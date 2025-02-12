import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import {
  Comic,
  ComicIssue,
  CreatorChannel,
  PhysicalItem,
  User,
} from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { D_READER_LINKS, apiUrl } from '../utils/client-links';
import { TWITTER_INTENT } from '../utils/twitter';
import { ERROR_MESSAGES } from '../utils/errors';

// To consider:
// send reports for critical backend errors to errors@dreader.io
// send notifications to important@dreader.io when someone creates a comic / comic issue
// https://github.com/nodemailer/nodemailer/issues/487

const logError = (template: string, recipient: string, e: any) => {
  console.error(`Failed to send ${template} email to ${recipient}`);
  console.error('ERROR: ', e);
};

const USER_REGISTERED = 'userRegistered';
const USER_SCHEDULED_FOR_DELETION = 'userScheduledForDeletion';
const USER_DELETED = 'userDeleted';
const USER_PASSWORD_RESET = 'userPasswordReset';
const USER_PASSWORD_RESET_REQUESTED = 'userPasswordResetRequested';
const BUMP_USER_WITH_EMAIL_VERIFICATION = 'bumpUserWithEmailVerification';
const USER_EMAIL_VERIFICATION_REQUESTED = 'userEmailVerificationRequested';
// const CREATOR_REGISTERED = 'creatorRegistered';
const CREATOR_SCHEDULED_FOR_DELETION = 'creatorScheduledForDeletion';
const CREATOR_DELETED = 'creatorDeleted';
// const BUMP_CREATOR_WITH_EMAIL_VERIFICATION = 'bumpCreatorWithEmailVerification';
// const CREATOR_EMAIL_VERIFICATION_REQUESTED =
//   'creatorEmailVerificationRequested';
const CREATOR_VERIFIED = 'creatorVerified';
const USER_EMAIL_CHANGE_REQUESTED = 'userEmailChangeRequested';
const USER_EMAIL_CHANGED = 'userEmailChanged';
const COMIC_SERIES_VERIFIED = 'comicSeriesVerified';
const COMIC_SERIES_PUBLISHED = 'comicSeriesPublished';
const COMIC_ISSUE_VERIFIED = 'comicIssueVerified';
const COMIC_ISSUE_PUBLISHED = 'comicIssuePublished';
const CLAIM_PHYISCAL_DROP = 'claimPhysicalDrop';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly authService: AuthService,
  ) {}

  async userRegistered(user: User) {
    const verificationToken = this.authService.generateEmailToken(
      user.id,
      user.email,
    );

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '🎉 Account created!',
        template: USER_REGISTERED,
        context: {
          name: user.username,
          apiUrl,
          actionUrl:
            !user.emailVerifiedAt &&
            D_READER_LINKS.emailVerification(verificationToken),
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
          name: user.username,
          apiUrl,
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
          name: user.username,
          apiUrl,
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
          name: user.username,
          apiUrl,
          actionUrl: D_READER_LINKS.resetPassword(verificationToken),
        },
      });
    } catch (e) {
      logError(USER_PASSWORD_RESET_REQUESTED, user.email, e);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.UNABLE_TO_SEND_MAIL('password reset requested'),
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
          name: user.username,
          apiUrl,
        },
      });
    } catch (e) {
      logError(USER_PASSWORD_RESET, user.email, e);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.UNABLE_TO_SEND_MAIL('password reset'),
      );
    }
  }

  async bumpUserWithEmailVerification(user: User) {
    const verificationToken = this.authService.generateEmailToken(
      user.id,
      user.email,
    );

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '🕵️‍♂️ e-mail verification!',
        template: BUMP_USER_WITH_EMAIL_VERIFICATION,
        context: {
          name: user.username,
          apiUrl,
          actionUrl: D_READER_LINKS.emailVerification(verificationToken),
        },
      });
    } catch (e) {
      logError(BUMP_USER_WITH_EMAIL_VERIFICATION, user.email, e);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.UNABLE_TO_SEND_MAIL('bump e-mail verification'),
      );
    }
  }

  async requestUserEmailVerification(user: User) {
    const verificationToken = this.authService.generateEmailToken(
      user.id,
      user.email,
    );

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '🕵️‍♂️ e-mail verification!',
        template: USER_EMAIL_VERIFICATION_REQUESTED,
        context: {
          name: user.username,
          apiUrl,
          actionUrl: D_READER_LINKS.emailVerification(verificationToken),
        },
      });
    } catch (e) {
      logError(USER_EMAIL_VERIFICATION_REQUESTED, user.email, e);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.UNABLE_TO_SEND_MAIL('e-mail verification'),
      );
    }
  }

  async requestUserEmailChange(user: User, newEmail: string) {
    const verificationToken = this.authService.generateEmailToken(
      user.id,
      newEmail,
      '3d',
    );

    try {
      await this.mailerService.sendMail({
        to: newEmail,
        subject: '🚨 email change requested!',
        template: USER_EMAIL_CHANGE_REQUESTED,
        context: {
          apiUrl,
          actionUrl: D_READER_LINKS.emailVerification(verificationToken),
        },
      });
    } catch (e) {
      logError(USER_EMAIL_CHANGE_REQUESTED, newEmail, e);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.UNABLE_TO_SEND_MAIL('request email change'),
      );
    }
  }

  async userEmailChanged(user: User) {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '📧 Successfully changed email',
        template: USER_EMAIL_CHANGED,
        context: { name: user.username, apiUrl },
      });
    } catch (e) {
      logError(USER_EMAIL_CHANGED, user.email, e);
      throw new InternalServerErrorException(
        ERROR_MESSAGES.UNABLE_TO_SEND_MAIL('email email changed'),
      );
    }
  }

  async creatorScheduledForDeletion(creator: CreatorChannel, email: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '🫂 Account scheduled for deletion!',
        template: CREATOR_SCHEDULED_FOR_DELETION,
        context: {
          name: creator.handle,
          apiUrl,
        },
      });
    } catch (e) {
      logError(CREATOR_SCHEDULED_FOR_DELETION, email, e);
    }
  }

  async creatorDeleted(creator: CreatorChannel, email: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '👋 Account deleted!',
        template: CREATOR_DELETED,
        context: {
          name: creator.handle,
          apiUrl,
        },
      });
    } catch (e) {
      logError(CREATOR_DELETED, email, e);
    }
  }

  async creatorVerified(creator: CreatorChannel, email: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '✅ Channel verified!',
        template: CREATOR_VERIFIED,
        context: {
          name: creator.handle,
          apiUrl,
          shareOnTwitterLink: TWITTER_INTENT.creatorVerified(creator),
        },
      });
    } catch (e) {
      logError(CREATOR_VERIFIED, email, e);
    }
  }

  async comicVerifed(
    comic: Comic & { creator: CreatorChannel },
    email: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '📗 Comic series verified',
        template: COMIC_SERIES_VERIFIED,
        context: {
          comicTitle: comic.title,
          name: comic.creator.handle,
          apiUrl,
        },
      });
    } catch (e) {
      logError(COMIC_SERIES_VERIFIED, email, e);
    }
  }

  async comicPublished(
    comic: Comic & { creator: CreatorChannel },
    email: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '📗 Comic series published',
        template: COMIC_SERIES_PUBLISHED,
        context: {
          comicTitle: comic.title,
          name: comic.creator.handle,
          shareOnTwitterLink: TWITTER_INTENT.comicPublished(comic),
          apiUrl,
        },
      });
    } catch (e) {
      logError(COMIC_SERIES_PUBLISHED, email, e);
    }
  }

  async comicIssueVerified(
    comicIssue: ComicIssue & { comic: Comic & { creator: CreatorChannel } },
    email: string,
  ) {
    const {
      comic: { creator },
    } = comicIssue;
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '📙 Comic episode verified',
        template: COMIC_ISSUE_VERIFIED,
        context: {
          comicIssueTitle: comicIssue.title,
          name: creator.handle,
          apiUrl,
        },
      });
    } catch (e) {
      logError(COMIC_ISSUE_VERIFIED, email, e);
    }
  }

  async comicIssuePublished(
    comicIssue: ComicIssue & { comic: Comic & { creator: CreatorChannel } },
    email: string,
  ) {
    const {
      comic: { creator },
    } = comicIssue;
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '📙 Comic episode published',
        template: COMIC_ISSUE_PUBLISHED,
        context: {
          comicIssueTitle: comicIssue.title,
          name: creator.handle,
          apiUrl,
          shareOnTwitterLink: TWITTER_INTENT.comicIssuePublished(comicIssue),
        },
      });
    } catch (e) {
      logError(COMIC_ISSUE_PUBLISHED, email, e);
    }
  }

  async claimPhysicalDrop(physical: PhysicalItem, user: User) {
    const { name, description, image } = physical;
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `Congratulations 🎉, You've won ${name} in the dReader's Spin The Wheel.`,
        template: CLAIM_PHYISCAL_DROP, // todo: Change this to physical drop template
        context: {
          name,
          description,
          image,
          apiUrl,
        },
      });
    } catch (e) {
      logError(CLAIM_PHYISCAL_DROP, user.email, e);
    }
  }
}
