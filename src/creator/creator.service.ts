import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { UpdateCreatorDto } from '../creator/dto/update-creator.dto';
import { Creator, Genre } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { subDays } from 'date-fns';
import { CreatorFilterParams } from './dto/creator-params.dto';
import { UserCreatorService } from './user-creator.service';
import { s3Service } from '../aws/s3.service';
import { PickFields } from '../types/shared';
import { appendTimestamp } from '../utils/helpers';
import { CreatorStats } from '../comic/types/creator-stats';
import { getCreatorsQuery } from './creator.queries';
import { getRandomFloatOrInt } from '../utils/helpers';
import { RegisterDto } from '../types/register.dto';
import { PasswordService } from '../auth/password.service';
import { UpdatePasswordDto } from '../types/update-password.dto';
import { validateCreatorName, validateEmail } from '../utils/user';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { LoginDto } from '../types/login.dto';
import { insensitive } from '../utils/lodash';
import { isEmail } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';
import { kebabCase } from 'lodash';

const getS3Folder = (slug: string) => `creators/${slug}/`;
type CreatorFileProperty = PickFields<Creator, 'avatar' | 'banner' | 'logo'>;

@Injectable()
export class CreatorService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly userCreatorService: UserCreatorService,
    private readonly passwordService: PasswordService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;
    const slug = kebabCase(name);

    validateCreatorName(name);
    validateEmail(email);

    const [hashedPassword] = await Promise.all([
      this.passwordService.hash(password),
      this.throwIfNameTaken(name),
      this.throwIfSlugTaken(slug),
      this.throwIfEmailTaken(email),
    ]);

    const creator = await this.prisma.creator.create({
      data: { name, email, password: hashedPassword, slug },
    });

    const verificationToken = this.authService.signEmail(email);
    this.mailService.creatorRegistered(creator, verificationToken);
    return creator;
  }

  async login(loginDto: LoginDto) {
    const { nameOrEmail, password } = loginDto;

    if (!nameOrEmail) {
      throw new BadRequestException('Please provide email or username');
    }

    let creator: Creator;
    if (isEmail(nameOrEmail)) {
      creator = await this.findByEmail(nameOrEmail);
    } else {
      // for now, creators can only log in via email
      throw new BadRequestException('Incorrect email format');
    }

    await this.passwordService.validate(password, creator.password);
    return this.prisma.creator.update({
      where: { id: creator.id },
      data: { lastLogin: new Date() },
    });
  }

  async findAll(query: CreatorFilterParams) {
    const creators = await this.prisma.$queryRaw<
      Array<Creator & { genres: Genre[] } & CreatorStats>
    >(getCreatorsQuery(query));
    return creators.map((creator) => {
      return {
        ...creator,
        stats: {
          totalVolume: getRandomFloatOrInt(1, 1000),
          followersCount: Number(creator.followersCount),
          comicIssuesCount: 0,
        },
      };
    });
  }

  async findMe(id: number) {
    const creator = await this.prisma.creator.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });

    return creator;
  }

  async findOne(slug: string, userId?: number) {
    const findCreator = this.prisma.creator.findUnique({ where: { slug } });
    const getStats = this.userCreatorService.getCreatorStats(slug);
    const getMyStats = this.userCreatorService.getUserStats(slug, userId);

    const [creator, stats, myStats] = await Promise.all([
      findCreator,
      getStats,
      getMyStats,
    ]);

    if (!creator) {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }

    return { ...creator, stats, myStats };
  }

  async findByEmail(email: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { email: insensitive(email) },
    });

    if (!creator) {
      throw new NotFoundException(`Creator with email ${email} does not exist`);
    } else return creator;
  }

  async update(slug: string, updateCreatorDto: UpdateCreatorDto) {
    const { email, ...otherData } = updateCreatorDto;

    const creator = await this.prisma.creator.findUnique({ where: { slug } });
    const isEmailUpdated = email && creator.email !== email;

    if (isEmailUpdated) {
      validateEmail(email);
      await this.throwIfEmailTaken(email);
      await this.prisma.creator.update({
        where: { slug },
        data: { email, emailVerifiedAt: null },
      });

      const verificationToken = this.authService.signEmail(creator.email);
      await this.mailService.requestCreatorEmailVerification(
        creator,
        verificationToken,
      );
    }

    const updatedCreator = await this.prisma.creator.update({
      where: { slug },
      data: otherData,
    });

    return updatedCreator;
  }

  async updatePassword(slug: string, updatePasswordDto: UpdatePasswordDto) {
    const { oldPassword, newPassword } = updatePasswordDto;

    const creator = await this.findOne(slug);

    const [hashedPassword] = await Promise.all([
      this.passwordService.hash(newPassword),
      this.passwordService.validate(oldPassword, creator.password),
    ]);

    if (oldPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    return await this.prisma.creator.update({
      where: { slug },
      data: { password: hashedPassword },
    });
  }

  async resetPassword(slug: string) {
    const newPassword = uuidv4();
    const hashedPassword = await this.passwordService.hash(newPassword);

    const creator = await this.prisma.creator.findUnique({ where: { slug } });
    await this.mailService.creatorPasswordReset(creator, hashedPassword);
    return await this.prisma.creator.update({
      where: { slug },
      data: { password: newPassword },
    });
  }

  async requestEmailVerification(email: string) {
    const creator = await this.findByEmail(email);

    if (!!creator.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    const verificationToken = this.authService.signEmail(creator.email);
    await this.mailService.requestCreatorEmailVerification(
      creator,
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

    const creator = await this.prisma.creator.findFirst({
      where: { email: insensitive(email) },
    });

    if (!!creator.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    return await this.prisma.creator.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async throwIfNameTaken(name: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { name: insensitive(name) },
    });

    if (creator) throw new BadRequestException(`${name} already taken`);
  }

  async throwIfSlugTaken(slug: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { slug: insensitive(slug) },
    });

    if (creator) throw new BadRequestException(`${slug} already taken`);
  }

  async throwIfEmailTaken(email: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { email: insensitive(email) },
    });

    if (creator) throw new BadRequestException(`${email} already taken`);
  }

  async updateFile(
    slug: string,
    file: Express.Multer.File,
    field: CreatorFileProperty,
  ) {
    let creator: Creator;
    try {
      creator = await this.prisma.creator.findUnique({ where: { slug } });
    } catch {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }

    const s3Folder = getS3Folder(slug);
    const oldFileKey = creator[field];
    const fileName = appendTimestamp(field);
    const newFileKey = await this.s3.uploadFile(s3Folder, file, fileName);

    try {
      creator = await this.prisma.creator.update({
        where: { slug },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await this.s3.deleteObject(newFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);
    return creator;
  }

  async pseudoDelete(slug: string) {
    try {
      return await this.prisma.creator.update({
        where: { slug },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }
  }

  async pseudoRecover(slug: string) {
    try {
      return await this.prisma.creator.update({
        where: { slug },
        data: { deletedAt: null },
      });
    } catch {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async clearCreatorsQueuedForRemoval() {
    const where = { where: { deletedAt: { lte: subDays(new Date(), 30) } } };
    const creatorsToRemove = await this.prisma.creator.findMany(where);
    await this.prisma.creator.deleteMany(where);

    for (const creator of creatorsToRemove) {
      const s3Folder = getS3Folder(creator.slug);
      await this.s3.deleteFolder(s3Folder);
    }
  }
}
