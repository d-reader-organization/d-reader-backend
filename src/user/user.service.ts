import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { UpdateUserDto } from '../types/update-user.dto';
import * as jdenticon from 'jdenticon';
import { s3File, s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import { isEmail } from 'class-validator';
import { RegisterDto } from '../types/register.dto';
import { LoginDto } from '../types/login.dto';
import {
  ResetPasswordDto,
  UpdatePasswordDto,
} from '../types/update-password.dto';
import { validateEmail, validateUserName } from '../utils/user';
import { WalletService } from '../wallet/wallet.service';
import { PasswordService } from '../auth/password.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { insensitive } from '../utils/lodash';
import { ConsentType, User, UserPrivacyConsent } from '@prisma/client';
import { UserFilterParams } from './dto/user-params.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sleep } from '../utils/helpers';
import { subDays } from 'date-fns';
import {
  EmailPayload,
  GoogleUserPayload,
  UserPayload,
} from '../auth/dto/authorization.dto';
import { CreateUserConsentDto } from './dto/create-user-consent.dto';
import { ERROR_MESSAGES } from '../utils/errors';
import { UserInput } from './dto/user.dto';
import { WebSocketGateway } from '../websockets/websocket.gateway';
import { ActivityNotificationType } from 'src/websockets/dto/activity-notification.dto';

const getS3Folder = (id: number) => `users/${id}/`;
type UserFileProperty = PickFields<User, 'avatar'>;

@Injectable()
export class UserService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly passwordService: PasswordService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
    private readonly websocketGateway: WebSocketGateway,
  ) {}

  async register(registerDto: RegisterDto) {
    const {
      name: deprecatedName,
      username,
      email,
      password,
      ref,
    } = registerDto;

    const name = username || deprecatedName;
    validateUserName(name);
    validateEmail(email);

    const [hashedPassword] = await Promise.all([
      password && this.passwordService.hash(password),
      this.throwIfNameTaken(name),
      this.throwIfEmailTaken(email),
    ]);

    let user = await this.prisma.user.create({
      data: {
        username: name,
        displayName: name,
        email,
        password: hashedPassword,
        ...(!hashedPassword && { emailVerifiedAt: new Date() }), // no password = google register
      },
    });

    await this.updateAllUserConsents({ approve: true, userId: user.id });
    this.redeemReferral(ref, user.id);

    try {
      const avatar = await this.generateAvatar(user.id);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { avatar },
      });
    } catch (e) {
      console.info('Failed to generate random avatar: ', e);
    }

    this.websocketGateway.handleActivityNotification({
      user,
      type: ActivityNotificationType.UserRegistered,
      targetId: user.id.toString(),
      targetTitle: user.username,
    });

    this.mailService.userRegistered(user);
    return user;
  }

  async redeemReferral(ref: string, refereeId: number) {
    if (!ref) {
      // log the error, don't throw it (as to not stop the parent flow)
      console.error(ERROR_MESSAGES.REFERRER_NAME_UNDEFINED);
    } else if (!refereeId) {
      console.error(ERROR_MESSAGES.REFEREE_ID_MISSING);
    } else {
      // find the referrer
      const referrer = await this.prisma.user.findFirst({
        where: { username: insensitive(ref) },
        include: { referrals: true },
      });

      if (!referrer) {
        // handle bad cases
        console.error(`User '${ref}' doesn't exist`);
      } else if (referrer.referralsRemaining == 0) {
        console.error(`${referrer.username} has no referrals left`);
      } else if (referrer.id === refereeId) {
        throw new BadRequestException('Cannot refer yourself');
      } else {
        // if it's all good so far, find the referee and apply the referral
        const referee = await this.prisma.user.findUnique({
          where: { id: refereeId },
        });

        if (!!referee.referredAt) {
          throw new BadRequestException(
            ERROR_MESSAGES.USER_ALREADY_REFERRED(referee.username),
          );
        }

        const updatedReferee = await this.prisma.user.update({
          where: { id: refereeId },
          data: {
            referredAt: new Date(),
            referrer: {
              connect: { id: referrer.id },
              update: { referralsRemaining: { decrement: 1 } },
            },
          },
        });

        return updatedReferee;
      }
    }
  }

  private async updateAllUserConsents({
    approve,
    userId,
  }: {
    approve: boolean;
    userId: number;
  }) {
    const userConsentPromises = Object.keys(ConsentType).map((consentType) =>
      this.prisma.userPrivacyConsent.create({
        data: {
          consentType: ConsentType[consentType],
          userId,
          isConsentGiven: approve,
        },
      }),
    );

    return Promise.all(userConsentPromises);
  }

  async login(loginDto: LoginDto) {
    const { nameOrEmail, password } = loginDto;

    if (!nameOrEmail) {
      throw new BadRequestException('Please provide email or username');
    }

    let user: User;
    if (isEmail(nameOrEmail)) {
      user = await this.findByEmail(nameOrEmail);
    } else {
      user = await this.findByName(nameOrEmail);
    }

    if (!user.password.length) {
      throw new BadRequestException(ERROR_MESSAGES.GOOGLE_ACCOUNT_LINKED);
    }

    await this.passwordService.validate(password, user.password);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
  }

  async handleGoogleSignIn(googleUser: GoogleUserPayload) {
    const { email } = googleUser;

    try {
      const user = await this.findByEmail(email);
      if (!user.emailVerifiedAt) {
        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            emailVerifiedAt: new Date(),
          },
        });
      }
      return this.authService.authorizeUser(user);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      return false;
    }
  }

  async syncWallets(id: number) {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId: id },
    });

    for (const wallet of wallets) {
      await this.walletService.syncWallet(wallet.address);
    }
  }

  async findAll(query: UserFilterParams) {
    const users = await this.prisma.user.findMany({
      skip: query?.skip,
      take: query?.take,
      where: { deletedAt: null },
    });

    return users;
  }

  async findMe(id: number): Promise<UserInput> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { lastActiveAt: new Date() },
      include: { devices: true },
    });

    const referralUsed = await this.countReferralUsed(id);
    return { ...user, referralUsed };
  }

  async countReferralUsed(userId: number) {
    const referralUsed = await this.prisma.user.count({
      where: { referrerId: userId },
    });
    return referralUsed;
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(
        ERROR_MESSAGES.USER_NOT_FOUND({ key: 'id', value: id }),
      );
    } else return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: insensitive(email) },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} does not exist`);
    } else return user;
  }

  async findByName(name: string) {
    const user = await this.prisma.user.findFirst({
      where: { username: insensitive(name) },
    });

    if (!user) {
      throw new NotFoundException(`User with name ${name} does not exist`);
    } else return user;
  }

  async getAssets(userId: number) {
    const assets = await this.prisma.collectibleComic.findMany({
      where: { digitalAsset: { owner: { userId } } },
      orderBy: { name: 'asc' },
      include: {
        metadata: {
          include: {
            collection: {
              include: { comicIssue: { include: { statefulCovers: true } } },
            },
          },
        },
      },
    });
    return assets;
  }

  async getWallets(userId: number) {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { address: 'asc' },
    });

    return wallets;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const { username, displayName, email } = updateUserDto;

    const user = await this.findOne(id);
    const isEmailUpdated = email && user.email !== email;
    const isUsernameUpdated = username && user.username !== username;
    const isDisplayNameUpdated =
      displayName && user.displayName !== displayName;

    if (isEmailUpdated) {
      validateEmail(email);
      await this.throwIfEmailTaken(email);

      await this.prisma.user.update({
        where: { id },
        data: { email, emailVerifiedAt: null },
      });

      this.mailService.requestUserEmailVerification(user);
    }

    if (isUsernameUpdated) {
      validateUserName(username);
      await this.throwIfNameTaken(username);
      await this.prisma.user.update({
        where: { id },
        data: { username },
      });
    }

    if (isDisplayNameUpdated) {
      await this.prisma.user.update({
        where: { id },
        data: { displayName },
      });
    }

    const updatedUser = await this.prisma.user.findUnique({ where: { id } });
    return updatedUser;
  }

  async updatePassword(id: number, updatePasswordDto: UpdatePasswordDto) {
    const { oldPassword, newPassword } = updatePasswordDto;

    const user = await this.findOne(id);

    const [hashedPassword] = await Promise.all([
      this.passwordService.hash(newPassword),
      this.passwordService.validate(oldPassword, user.password),
    ]);

    if (oldPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return updatedUser;
  }

  async requestPasswordReset(nameOrEmail: string) {
    let user: User;
    if (isEmail(nameOrEmail)) {
      user = await this.findByEmail(nameOrEmail);
    } else {
      user = await this.findByName(nameOrEmail);
    }

    const verificationToken = this.authService.generateEmailToken(
      user.id,
      user.email,
      '10min',
    );
    await this.mailService.requestUserPasswordReset(user, verificationToken);
  }

  async resetPassword({ verificationToken, newPassword }: ResetPasswordDto) {
    let payload: EmailPayload;

    try {
      payload = this.authService.verifyEmailToken(verificationToken);
    } catch (e) {
      // resend 'request password reset' email if token verification failed
      this.requestPasswordReset(payload.email);
      throw e;
    }

    const user = await this.findOne(payload.id);

    const hashedPassword = await this.passwordService.hash(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    await this.mailService.userPasswordReset(user);
  }

  async requestEmailVerification(email: string) {
    const user = await this.findByEmail(email);

    if (!!user.emailVerifiedAt) {
      throw new BadRequestException(ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED);
    }

    await this.mailService.requestUserEmailVerification(user);
  }

  async requestEmailChange({ email, id }: UserPayload, newEmail: string) {
    if (email === newEmail) {
      throw new BadRequestException(
        `Email must be different from the current email.`,
      );
    }
    validateEmail(newEmail);
    await this.throwIfEmailTaken(newEmail);

    const user = await this.findOne(id);
    await this.mailService.requestUserEmailChange(user, newEmail);
  }

  async verifyEmail(verificationToken: string) {
    let payload: EmailPayload;

    try {
      payload = this.authService.verifyEmailToken(verificationToken);
    } catch (e) {
      // resend 'request email verification' email if token verification failed
      this.requestEmailVerification(payload.email);
      throw e;
    }

    const user = await this.findOne(payload.id);
    validateEmail(payload.email);

    // if verificationToken holds the new email address, user has updated it
    const isEmailUpdated = user.email !== payload.email;
    if (isEmailUpdated) {
      await this.throwIfEmailTaken(payload.email); // make sure new email is not taken
    } else if (!!user.emailVerifiedAt) {
      // if email is not updated, stop here if it's already verified
      throw new BadRequestException('Email already verified');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: payload.id },
      data: { email: payload.email, emailVerifiedAt: new Date() },
    });

    if (isEmailUpdated) {
      await this.mailService.userEmailChanged(updatedUser);
    }

    return updatedUser;
  }

  async throwIfNameTaken(name: string) {
    const user = await this.prisma.user.findFirst({
      where: { username: insensitive(name) },
    });

    if (user)
      throw new BadRequestException(
        ERROR_MESSAGES.USERNAME_ALREADY_TAKEN(name),
      );
  }

  async throwIfEmailTaken(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: insensitive(email) },
    });

    if (user)
      throw new BadRequestException(ERROR_MESSAGES.EMAIL_ALREADY_TAKEN(email));
  }

  async updateFile(
    id: number,
    file: Express.Multer.File,
    field: UserFileProperty,
  ) {
    let user = await this.findOne(id);

    const s3Folder = getS3Folder(id);
    const oldFileKey = user[field];
    const newFileKey = await this.s3.uploadFile(file, {
      s3Folder,
      fileName: field,
      timestamp: true,
    });

    try {
      user = await this.prisma.user.update({
        where: { id },
        data: { [field]: newFileKey },
      });
    } catch (e) {
      await this.s3.garbageCollectNewFile(newFileKey, oldFileKey);
      throw e;
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return user;
  }

  async removeAvatar(id: number) {
    const user = await this.findOne(id);
    const updateUser = await this.prisma.user.update({
      where: { id },
      data: { avatar: '' },
    });

    const oldFileKey = user.avatar;
    await this.s3.garbageCollectOldFiles([], [oldFileKey]);
    return updateUser;
  }

  async generateAvatar(id: number) {
    const buffer = jdenticon.toPng(id, 500);
    const file: s3File = {
      fieldname: 'avatar.png',
      originalname: 'avatar.png',
      mimetype: 'image/png',
      buffer,
    };

    const s3Folder = getS3Folder(id);
    return this.s3.uploadFile(file, {
      s3Folder,
      fileName: 'avatar',
      timestamp: true,
    });
  }

  async pseudoDelete(id: number) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      this.mailService.userScheduledForDeletion(user);
      return user;
    } catch {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async pseudoRecover(id: number) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { deletedAt: null },
      });
    } catch {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async insertDeviceToken({
    deviceToken,
    userId,
  }: {
    deviceToken: string;
    userId: number;
  }) {
    const device = await this.prisma.device.findFirst({
      where: {
        token: deviceToken,
        userId,
      },
    });
    if (device) {
      return;
    }
    await this.prisma.device.create({
      data: {
        token: deviceToken,
        userId,
      },
    });
  }

  async getUserPrivacyConsents(userId: number): Promise<UserPrivacyConsent[]> {
    return this.prisma.userPrivacyConsent.findMany({
      where: {
        userId,
      },
      distinct: 'consentType',
      orderBy: { id: 'desc' },
    });
  }

  async createUserPrivacyConsent(
    input: CreateUserConsentDto & { userId: number },
  ): Promise<UserPrivacyConsent> {
    return this.prisma.userPrivacyConsent.create({ data: input });
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  protected async bumpNewUsersWithUnverifiedEmails() {
    // const newUnverifiedUsers = await this.prisma.user.findMany({
    //   where: {
    //     emailVerifiedAt: null,
    //     createdAt: { lte: subDays(new Date(), 3), gte: subDays(new Date(), 4) },
    //   },
    // });

    const newUnverifiedUsers = await this.prisma.user.findMany({
      where: {
        AND: [
          { emailVerifiedAt: null },
          // created more than 3 days ago
          { createdAt: { lte: subDays(new Date(), 3) } },
          // created not longer than 4 days ago
          { createdAt: { gte: subDays(new Date(), 4) } },
        ],
      },
    });

    for (const user of newUnverifiedUsers) {
      this.mailService.bumpUserWithEmailVerification(user);
      await sleep(5000); // sleep 5 seconds to prevent spam
    }
  }

  // Should we first check if user has some dangling relations with Wallets etc?
  // onDelete: Cascade should/could be used in the schema
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  protected async clearUsersQueuedForRemoval() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const where = { where: { deletedAt: { lte: subDays(new Date(), 60) } } };
    // const usersToRemove = await this.prisma.user.findMany(where);
    // for (const user of usersToRemove) {
    //   await this.mailService.userDeleted(user);

    //   const s3Folder = getS3Folder(user.id);
    //   await this.s3.deleteFolder(s3Folder);

    //   await this.prisma.user.delete({ where: { id: user.id } });
    // }
  }
}
