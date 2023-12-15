import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { UpdateUserDto } from '../types/update-user.dto';
import * as jdenticon from 'jdenticon';
import { s3File, s3Service } from '../aws/s3.service';
import { isSolanaAddress } from '../decorators/IsSolanaAddress';
import { PickFields, Referee } from '../types/shared';
import { isEmail, isNumberString } from 'class-validator';
import { RegisterDto } from '../types/register.dto';
import { LoginDto } from '../types/login.dto';
import {
  ResetPasswordDto,
  UpdatePasswordDto,
} from '../types/update-password.dto';
import { validateEmail, validateName } from '../utils/user';
import { WalletService } from '../wallet/wallet.service';
import { PasswordService } from '../auth/password.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { insensitive } from '../utils/lodash';
import { User, Wallet } from '@prisma/client';
import { UserFilterParams } from './dto/user-params.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sleep } from '../utils/helpers';
import { subDays } from 'date-fns';
import {
  FREE_MINT_GROUP_LABEL,
  REFERRAL_REWARD_GROUP_LABEL,
  REFERRAL_REWARD_LIMIT,
} from '../constants';

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
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    validateName(name);
    validateEmail(email);

    const [hashedPassword] = await Promise.all([
      this.passwordService.hash(password),
      this.throwIfNameTaken(name),
      this.throwIfEmailTaken(email),
    ]);

    let user = await this.prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    try {
      const avatar = await this.generateAvatar(user.id);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { avatar },
      });
    } catch (e) {
      console.info('Failed to generate random avatar: ', e);
    }

    this.mailService.userRegistered(user);
    return user;
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

    await this.passwordService.validate(password, user.password);
    return this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
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

  async findMe(id: number) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });

    return user;
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
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
      where: { name: insensitive(name) },
    });

    if (!user) {
      throw new NotFoundException(`User with name ${name} does not exist`);
    } else return user;
  }

  async getAssets(userId: number) {
    const nfts = await this.prisma.nft.findMany({
      where: { owner: { userId } },
      orderBy: { name: 'asc' },
    });
    return nfts;
  }

  async getWallets(userId: number) {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { address: 'asc' },
    });

    return wallets;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const { referrer, name, email } = updateUserDto;

    const user = await this.findOne(id);
    const isEmailUpdated = email && user.email !== email;
    const isNameUpdated = name && user.name !== name;

    if (referrer) await this.redeemReferral(referrer, id);

    if (isEmailUpdated) {
      validateEmail(email);
      await this.throwIfEmailTaken(email);

      await this.prisma.user.update({
        where: { id },
        data: { email, emailVerifiedAt: null },
      });

      this.mailService.requestUserEmailVerification(user);
    }

    if (isNameUpdated) {
      validateName(name);
      await this.throwIfNameTaken(name);
      await this.prisma.user.update({
        where: { id },
        data: { name },
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

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException(`User with email ${email} doesn't exists.`);
    }

    const verificationToken = this.authService.signEmail(user.email, '10min');
    await this.mailService.requestUserPasswordReset(user, verificationToken);
  }

  async resetPassword({ verificationToken, newPassword }: ResetPasswordDto) {
    let email: string;

    try {
      email = this.authService.verifyEmailToken(verificationToken);
    } catch (e) {
      // resend 'request password reset' email if token verification failed
      this.requestPasswordReset(email);
      throw e;
    }

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException(`User with email ${email} doesn't exists.`);
    }

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
      throw new BadRequestException('Email already verified');
    }

    await this.mailService.requestUserEmailVerification(user);
  }

  async verifyEmail(verificationToken: string) {
    let email: string;

    try {
      email = this.authService.verifyEmailToken(verificationToken);
    } catch (e) {
      // resend 'request email verification' email if token verification failed
      this.requestEmailVerification(email);
      throw e;
    }

    const { wallets, ...user } = await this.prisma.user.findFirst({
      where: { email: insensitive(email) },
      include: {
        wallets: true,
        referrer: {
          include: { referrals: { include: { wallets: true } }, wallets: true },
        },
        referrals: { include: { wallets: true } },
      },
    });

    // TODO v2: this should all be fixed up
    let rewardedAt: Date = undefined,
      referCompeletedAt = undefined;

    if (!!user.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    // Check the refer reward for current user
    try {
      if (
        wallets.length &&
        this.walletService.checkIfUserIsEligibleForReferrerReward(user)
      ) {
        await this.walletService.rewardUserWallet(
          wallets,
          REFERRAL_REWARD_GROUP_LABEL,
        );
        referCompeletedAt = new Date();
      }
    } catch (e) {
      console.error(`Error giving refer reward to user ${user.id}`);
    }

    // Check the refer reward for referrer
    try {
      if (
        user.referrer &&
        user.referrer.wallets.length > 0 &&
        this.walletService.checkIfUserIsEligibleForReferrerReward(user.referrer)
      ) {
        await this.walletService.rewardUserWallet(
          user.referrer.wallets,
          REFERRAL_REWARD_GROUP_LABEL,
        );
        await this.prisma.user.update({
          where: { id: user.referrerId },
          data: { referCompeletedAt: new Date() },
        });
      }
    } catch (e) {
      console.error(`Error giving refer reward to user ${user.referrerId}`);
    }

    try {
      if (
        !user.rewardedAt &&
        wallets.length &&
        this.walletService.checkIfRewardClaimed(user.id)
      ) {
        await this.walletService.rewardUserWallet(
          wallets,
          FREE_MINT_GROUP_LABEL,
        );
        rewardedAt = new Date();
      }
    } catch (e) {
      console.error(`Error giving free reward to user ${user.id}`);
    }

    return await this.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), rewardedAt, referCompeletedAt },
    });
  }

  async throwIfNameTaken(name: string) {
    const user = await this.prisma.user.findFirst({
      where: { name: insensitive(name) },
    });

    if (user) throw new BadRequestException(`${name} already taken`);
  }

  async throwIfEmailTaken(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: insensitive(email) },
    });

    if (user) throw new BadRequestException(`${email} already taken`);
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

  async redeemReferral(referrerId: string, refereeId: number) {
    if (!referrerId) {
      throw new BadRequestException('Referrer id, name, or address undefined');
    } else if (!refereeId) {
      throw new BadRequestException('Referee id missing');
    }

    // if the search string is of type Solana address, search by address
    // if the search string is of type email, search by email
    // if the search string is of type number, search by id
    // if the search string is of type string, search by name
    let referrer: { referrals: Referee[]; wallets: Wallet[] } & User;
    if (isSolanaAddress(referrerId)) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { address: referrerId },
        include: {
          user: {
            include: {
              referrals: { include: { wallets: true } },
              wallets: true,
            },
          },
        },
      });
      referrer = wallet.user;
    } else if (isEmail(referrerId)) {
      referrer = await this.prisma.user.findFirst({
        where: { email: insensitive(referrerId) },
        include: { referrals: { include: { wallets: true } }, wallets: true },
      });
    } else if (isNumberString(referrerId)) {
      referrer = await this.prisma.user.findUnique({
        where: { id: +referrerId },
        include: { referrals: { include: { wallets: true } }, wallets: true },
      });
    } else {
      referrer = await this.prisma.user.findFirst({
        where: { name: insensitive(referrerId) },
        include: { referrals: { include: { wallets: true } }, wallets: true },
      });
    }

    if (!referrer) {
      throw new BadRequestException(`User '${referrerId}' doesn't exist`);
    } else if (referrer.referralsRemaining == 0) {
      throw new BadRequestException(`${referrer.name} has no referrals left`);
    } else if (referrer.id === refereeId) {
      throw new BadRequestException('Cannot refer yourself');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: refereeId },
      include: { wallets: true },
    });

    if (!!user.referredAt) {
      throw new BadRequestException(`User '${user.name}' already referred`);
    }

    // Check referrer and the referee here because at the moment referee is not fully referred and need to be seprately verified
    let referCompeletedAt: Date = undefined;
    try {
      if (
        user.emailVerifiedAt &&
        user.wallets.length &&
        referrer.emailVerifiedAt &&
        referrer.wallets.length &&
        this.walletService.checkIfUserIsEligibleForReferrerReward(
          referrer,
          REFERRAL_REWARD_LIMIT - 1,
        )
      ) {
        await this.walletService.rewardUserWallet(
          referrer.wallets,
          REFERRAL_REWARD_GROUP_LABEL,
        );
        referCompeletedAt = new Date();
      }
    } catch (e) {
      console.error(`Error giving refer reward to user ${referrerId}`);
    }

    return await this.prisma.user.update({
      where: { id: refereeId },
      data: {
        referredAt: new Date(),
        referrer: {
          connect: { id: referrer.id },
          update: { referralsRemaining: { decrement: 1 }, referCompeletedAt },
        },
      },
    });
  }

  async validateSagaUser(id: number) {
    const wallets = await this.prisma.wallet.findMany({
      where: { user: { id } },
    });

    let userHasSaga = false;
    for (const wallet of wallets) {
      const walletHasSaga = await this.walletService.hasSagaGenesisToken(
        wallet.address,
      );

      if (walletHasSaga) {
        userHasSaga = true;
        break;
      }
    }

    if (!userHasSaga) throw new BadRequestException('No SGT Token found');
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

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  protected async bumpNewUsersWithUnverifiedEmails() {
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
