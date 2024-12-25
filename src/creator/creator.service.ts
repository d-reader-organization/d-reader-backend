import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  UpdateCreatorDto,
  UpdateCreatorFilesDto,
} from '../creator/dto/update-creator.dto';
import { Creator, Genre, Prisma } from '@prisma/client';
import { subDays } from 'date-fns';
import { CreatorFilterParams } from './dto/creator-params.dto';
import { UserCreatorService } from './user-creator.service';
import { s3Service } from '../aws/s3.service';
import { CreatorStats } from '../comic/dto/types';
import { getCreatorGenresQuery, getCreatorsQuery } from './creator.queries';
import { appendTimestamp, sleep } from '../utils/helpers';
import { RegisterDto } from '../types/register.dto';
import { PasswordService } from '../auth/password.service';
import {
  ResetPasswordDto,
  UpdatePasswordDto,
} from '../types/update-password.dto';
import { validateCreatorName, validateEmail } from '../utils/user';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { LoginDto } from '../types/login.dto';
import { insensitive } from '../utils/lodash';
import { isEmail } from 'class-validator';
import { kebabCase } from 'lodash';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DiscordService } from '../discord/discord.service';
import { CreatorFile } from '../discord/dto/types';
import {
  SearchCreator,
  CreatorFileProperty,
  CreatorStatusProperty,
} from './dto/types';
import { RawCreatorFilterParams } from './dto/raw-creator-params.dto';
import { EmailPayload } from '../auth/dto/authorization.dto';
import { SearchCreatorParams } from './dto/search-creator-params.dto';
import { CacheService } from '../cache/cache.service';
import { CachePath } from '../utils/cache';
import { ERROR_MESSAGES } from '../utils/errors';

const getS3Folder = (slug: string) => `creators/${slug}/`;

@Injectable()
export class CreatorService {
  constructor(
    private readonly s3: s3Service,
    private readonly prisma: PrismaService,
    private readonly userCreatorService: UserCreatorService,
    private readonly passwordService: PasswordService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
    private readonly discordService: DiscordService,
    private readonly cacheService: CacheService,
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
      data: {
        name,
        email,
        password: hashedPassword,
        slug,
        s3BucketSlug: appendTimestamp(slug),
      },
    });
    this.mailService.creatorRegistered(creator);
    this.discordService.creatorRegistered(creator);
    return creator;
  }

  async login(loginDto: LoginDto) {
    const { nameOrEmail, password } = loginDto;

    if (!nameOrEmail) {
      throw new BadRequestException(ERROR_MESSAGES.EMAIL_OR_USERNAME_REQUIRED);
    }

    let creator: Creator;
    if (isEmail(nameOrEmail)) {
      creator = await this.findByEmail(nameOrEmail);
    } else {
      throw new BadRequestException(ERROR_MESSAGES.INCORRECT_EMAIL_FORMAT);
    }

    await this.passwordService.validate(password, creator.password);
    return this.prisma.creator.update({
      where: { id: creator.id },
      data: { lastLogin: new Date() },
    });
  }

  async findAll({
    query,
    userId,
  }: {
    query: CreatorFilterParams;
    userId?: number;
  }) {
    const creators = await this.prisma.$queryRaw<Array<Creator & CreatorStats>>(
      getCreatorsQuery(query),
    );
    const filteredCreators = [];

    for (const creator of creators) {
      const genresResult = await this.prisma.$queryRaw<[{ genres: Genre[] }]>(
        getCreatorGenresQuery(creator.id, query.genreSlugs),
      );
      if (!!genresResult.length) {
        const [totalVolume, myStats] = await Promise.all([
          this.userCreatorService.getTotalCreatorVolume(creator.slug),
          this.userCreatorService.getUserStats(creator.slug, userId),
        ]);
        filteredCreators.push({
          ...creator,
          stats: {
            // TODO comicIssuesCount and comicsCount are hotfix cause of mobile app
            // Will be fixed in next release on mobile
            comicIssuesCount: 0,
            comicsCount: 0,
            totalVolume,
            followersCount: Number(creator.followersCount),
          },
          myStats,
        });
      }
    }
    return filteredCreators;
  }

  async searchAll({
    search,
    skip,
    take,
    sortOrder,
  }: SearchCreatorParams): Promise<SearchCreator[]> {
    const creators = await this.prisma.creator.findMany({
      select: {
        avatar: true,
        id: true,
        name: true,
        slug: true,
      },
      where: {
        name: { contains: search, mode: 'insensitive' },
      },
      orderBy: { name: sortOrder },
      skip,
      take,
    });

    return await Promise.all(
      creators.map(async (creator) => {
        const issuesCount = await this.prisma.comicIssue.count({
          where: {
            publishedAt: { not: null },
            verifiedAt: { not: null },
            comic: {
              creatorId: creator.id,
            },
          },
        });
        return { ...creator, issuesCount };
      }),
    );
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
      throw new NotFoundException(ERROR_MESSAGES.CREATOR_NOT_FOUND(slug));
    }

    return { ...creator, stats, myStats };
  }

  async findAllRaw(query: RawCreatorFilterParams) {
    let where: Prisma.CreatorWhereInput;
    if (query.search) {
      where = { name: { contains: query.search, mode: 'insensitive' } };
    }
    return await this.prisma.creator.findMany({
      where,
      take: query.take,
      skip: query.skip,
    });
  }

  async findOneRaw(slug: string) {
    const creator = this.prisma.creator.findUnique({ where: { slug } });

    if (!creator) {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }

    return creator;
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
    const { email, name, ...otherData } = updateCreatorDto;
    const creator = await this.prisma.creator.findUnique({ where: { slug } });

    const isNameUpdated = name && creator.name !== name;
    let creatorSlug = slug;

    if (isNameUpdated) {
      validateCreatorName(name);

      const newSlug = kebabCase(name);
      await Promise.all([
        this.throwIfNameTaken(name),
        this.throwIfSlugTaken(newSlug),
      ]);

      await this.prisma.creator.update({
        where: { slug },
        data: { name, slug: newSlug },
      });
      creatorSlug = newSlug;
    }

    const isEmailUpdated = email && creator.email !== email;
    if (isEmailUpdated) {
      validateEmail(email);
      await this.throwIfEmailTaken(email);
      await this.prisma.creator.update({
        where: { slug: creatorSlug },
        data: { email, emailVerifiedAt: null },
      });

      this.mailService.requestCreatorEmailVerification(creator);
    }

    const updatedCreator = await this.prisma.creator.update({
      where: { slug: creatorSlug },
      data: otherData,
    });
    this.discordService.creatorProfileUpdated({
      oldCreator: creator,
      updatedCreator,
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
      throw new BadRequestException(ERROR_MESSAGES.NEW_PASSWORD_DIFFERENT);
    }

    return await this.prisma.creator.update({
      where: { slug },
      data: { password: hashedPassword },
    });
  }

  async requestPasswordReset(nameOrEmail: string) {
    const creator = await this.findByEmail(nameOrEmail);
    const verificationToken = this.authService.generateEmailToken(
      creator.id,
      creator.email,
      '10min',
    );
    await this.mailService.requestCreatorPasswordReset({
      creator,
      verificationToken,
    });
  }

  async resetPassword({ verificationToken, newPassword }: ResetPasswordDto) {
    const payload = this.authService.verifyEmailToken(verificationToken);
    const creator = await this.findMe(payload.id);

    const hashedPassword = await this.passwordService.hash(newPassword);
    await this.prisma.creator.update({
      where: { id: creator.id },
      data: { password: hashedPassword },
    });
    await this.mailService.creatorPasswordReset(creator);
  }

  async requestEmailVerification(email: string) {
    const creator = await this.findByEmail(email);

    if (!!creator.emailVerifiedAt) {
      throw new BadRequestException(ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED);
    }

    await this.mailService.requestCreatorEmailVerification(creator);
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

    const creator = await this.prisma.creator.findFirst({
      where: { id: payload.id },
    });

    if (!!creator.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    this.discordService.creatorEmailVerified(creator);
    return await this.prisma.creator.update({
      where: { id: payload.id },
      data: { email: payload.email, emailVerifiedAt: new Date() },
    });
  }

  async throwIfNameTaken(name: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { name: insensitive(name) },
    });

    if (creator)
      throw new BadRequestException(ERROR_MESSAGES.NAME_ALREADY_TAKEN(name));
  }

  async throwIfSlugTaken(slug: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { slug: insensitive(slug) },
    });

    if (creator)
      throw new BadRequestException(ERROR_MESSAGES.SLUG_ALREADY_TAKEN(slug));
  }

  async throwIfEmailTaken(email: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { email: insensitive(email) },
    });

    if (creator)
      throw new BadRequestException(ERROR_MESSAGES.EMAIL_ALREADY_TAKEN(email));
  }

  async updateFiles(slug: string, creatorFilesDto: UpdateCreatorFilesDto) {
    const { avatar, banner, logo } = creatorFilesDto;

    let creator = await this.prisma.creator.findUnique({ where: { slug } });

    let avatarKey: string, bannerKey: string, logoKey: string;

    const newFileKeys: string[] = [];
    const oldFileKeys: string[] = [];

    try {
      const s3Folder = getS3Folder(creator.s3BucketSlug);
      if (avatar) {
        avatarKey = await this.s3.uploadFile(avatar, {
          s3Folder,
          fileName: 'avatar',
        });
        newFileKeys.push(avatarKey);
        oldFileKeys.push(creator.avatar);
      }
      if (banner) {
        bannerKey = await this.s3.uploadFile(banner, {
          s3Folder,
          fileName: 'banner',
        });
        newFileKeys.push(bannerKey);
        oldFileKeys.push(creator.banner);
      }
      if (logo) {
        logoKey = await this.s3.uploadFile(logo, {
          s3Folder,
          fileName: 'logo',
        });
        newFileKeys.push(logoKey);
        oldFileKeys.push(creator.logo);
      }
      const creatorFiles: CreatorFile[] = [
        { type: 'avatar', value: avatarKey },
        { type: 'banner', value: bannerKey },
        { type: 'logo', value: logoKey },
      ];
      this.discordService.creatorFilesUpdated(creator.name, creatorFiles);
    } catch {
      await this.s3.garbageCollectNewFiles(newFileKeys, oldFileKeys);
      throw new BadRequestException(ERROR_MESSAGES.MALFORMED_FILE_UPLOAD);
    }

    creator = await this.prisma.creator.update({
      where: { slug },
      data: { avatar: avatarKey, banner: bannerKey, logo: logoKey },
    });

    await this.s3.garbageCollectOldFiles(newFileKeys, oldFileKeys);
    return creator;
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

    const s3Folder = getS3Folder(creator.s3BucketSlug);
    const oldFileKey = creator[field];
    const newFileKey = await this.s3.uploadFile(file, {
      s3Folder,
      fileName: field,
    });

    try {
      creator = await this.prisma.creator.update({
        where: { slug },
        data: { [file.fieldname]: newFileKey },
      });
    } catch {
      await this.s3.garbageCollectNewFile(newFileKey, oldFileKey);
      throw new BadRequestException('Malformed file upload');
    }

    const creatorFiles: CreatorFile[] = [{ type: field, value: newFileKey }];
    this.discordService.creatorFilesUpdated(creator.name, creatorFiles);
    await this.s3.garbageCollectOldFile(newFileKey, oldFileKey);

    return creator;
  }

  async pseudoDelete(slug: string) {
    // We should only allow account deletion if the creator has no published comics and comic issues?
    try {
      const creator = await this.prisma.creator.update({
        where: { slug },
        data: { deletedAt: new Date() },
      });
      this.mailService.creatorScheduledForDeletion(creator);
      return creator;
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

  async toggleDate({
    slug,
    property,
  }: {
    slug: string;
    property: CreatorStatusProperty;
  }): Promise<string | void> {
    const creator = await this.prisma.creator.findFirst({
      where: { slug },
    });
    if (!creator) {
      throw new NotFoundException(`Creator ${slug} does not exist`);
    }
    const updatedCreator = await this.prisma.creator.update({
      data: {
        [property]: !!creator[property] ? null : new Date(),
      },
      where: { slug },
    });

    this.discordService.creatorStatusUpdated(updatedCreator, property);
    if (updatedCreator.verifiedAt) {
      await this.cacheService.deleteByPattern(CachePath.CREATOR_GET_MANY);
      this.mailService.creatorVerified(updatedCreator);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  protected async bumpNewCreatorsWithUnverifiedEmails() {
    const newUnverifiedCreators = await this.prisma.creator.findMany({
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

    for (const creator of newUnverifiedCreators) {
      this.mailService.bumpCreatorWithEmailVerification(creator);
      await sleep(10000); // sleep 10 seconds to prevent spam
    }
  }

  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  protected async clearCreatorsQueuedForRemoval() {
    const where = { where: { deletedAt: { lte: subDays(new Date(), 30) } } };
    const creatorsToRemove = await this.prisma.creator.findMany(where);

    for (const creator of creatorsToRemove) {
      await this.mailService.creatorDeleted(creator);

      await this.prisma.creator.delete({ where: { id: creator.id } });

      const s3Folder = getS3Folder(creator.s3BucketSlug);
      await this.s3.deleteFolder(s3Folder);
    }
  }

  async dowloadAssets(slug: string) {
    const creator = await this.prisma.creator.findUnique({ where: { slug } });

    const assets = this.s3.getAttachments([
      creator.avatar,
      creator.banner,
      creator.logo,
    ]);
    return assets;
  }
}
