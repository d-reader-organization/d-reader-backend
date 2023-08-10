import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { UpdateUserDto } from '../types/update-user.dto';
import * as jdenticon from 'jdenticon';
import { s3Service } from '../aws/s3.service';
import { isSolanaAddress } from '../decorators/IsSolanaAddress';
import { PickFields } from '../types/shared';
import { appendTimestamp } from '../utils/helpers';
import { isEmail, isNumberString } from 'class-validator';
import { RegisterDto } from '../types/register.dto';
import { LoginDto } from '../types/login.dto';
import { UpdatePasswordDto } from '../types/update-password.dto';
import { validateEmail, validateName } from '../utils/user';
import { WalletService } from '../wallet/wallet.service';
import { PasswordService } from '../auth/password.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { insensitive } from '../utils/lodash';
import { User } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

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

    const verificationToken = this.authService.signEmail(email);
    this.mailService.userRegistered(user, verificationToken);
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

  async findAll() {
    const users = await this.prisma.user.findMany();

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

      const verificationToken = this.authService.signEmail(user.email);
      await this.mailService.requestUserEmailVerification(
        user,
        verificationToken,
      );
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

  async resetPassword(id: number) {
    const newPassword = uuidv4();
    const hashedPassword = await this.passwordService.hash(newPassword);

    const user = await this.prisma.user.findUnique({ where: { id } });
    await this.mailService.userPasswordReset(user, hashedPassword);
    await this.prisma.user.update({
      where: { id },
      data: { password: newPassword },
    });
  }

  async requestEmailVerification(email: string) {
    const user = await this.findByEmail(email);

    if (!!user.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    const verificationToken = this.authService.signEmail(user.email);
    await this.mailService.requestUserEmailVerification(
      user,
      verificationToken,
    );
  }

  async verifyEmail(verificationToken: string) {
    const email = this.authService.decodeEmail(verificationToken);

    try {
      this.authService.verifyEmail(verificationToken);
    } catch (e) {
      // resend 'request email verification' email if token verification failed
      this.requestEmailVerification(email);
      throw e;
    }

    const user = await this.prisma.user.findFirst({
      where: { email: insensitive(email) },
    });

    if (!!user.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    await this.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
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
    const fileName = appendTimestamp(field);
    const newFileKey = await this.s3.uploadFile(s3Folder, file, fileName);

    try {
      user = await this.prisma.user.update({
        where: { id },
        data: { [field]: newFileKey },
      });
    } catch (e) {
      await this.s3.deleteObject(newFileKey);
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
    let referrer: User;
    if (isSolanaAddress(referrerId)) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { address: referrerId },
        include: { user: true },
      });
      referrer = wallet.user;
    } else if (isEmail(referrerId)) {
      referrer = await this.prisma.user.findFirst({
        where: { email: insensitive(referrerId) },
      });
    } else if (isNumberString(referrerId)) {
      referrer = await this.prisma.user.findUnique({
        where: { id: +referrerId },
      });
    } else {
      referrer = await this.prisma.user.findFirst({
        where: { name: insensitive(referrerId) },
      });
    }

    if (!referrer) {
      throw new BadRequestException(`User '${referrerId}' doesn't exist`);
    } else if (referrer.referralsRemaining == 0) {
      throw new BadRequestException(`${referrer.name} has no referrals left`);
    } else if (referrer.id === refereeId) {
      throw new BadRequestException('Cannot refer yourself');
    }

    let user = await this.prisma.user.findUnique({
      where: { id: refereeId },
    });

    if (!!user.referredAt) {
      throw new BadRequestException(`User ${user.name} is already referred`);
    }

    user = await this.prisma.user.update({
      where: { id: referrer.id },
      data: {
        referredAt: new Date(),
        referrer: {
          connect: { id: referrer.id },
          update: { referralsRemaining: { decrement: 1 } },
        },
      },
    });

    return user;
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
    const buffer = jdenticon.toPng(id, 400);
    const file = {
      fieldname: 'avatar.png',
      originalname: 'con',
      mimetype: 'image/png',
      buffer,
    };
    const s3Folder = getS3Folder(id);
    return this.s3.uploadFile(s3Folder, file, 'avatar');
  }
}
