import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import {
  CreateComicSwaggerDto,
  CreateComicDto,
  CreateComicFilesDto,
} from 'src/comic/dto/create-comic.dto';
import { UpdateComicDto } from 'src/comic/dto/update-comic.dto';
import { ComicService } from './comic.service';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ComicDto } from './dto/comic.dto';
import { plainToInstance } from 'class-transformer';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { ComicUpdateGuard } from 'src/guards/comic-update.guard';
import { CreatorEntity } from 'src/decorators/creator.decorator';
import { Creator, Wallet } from '@prisma/client';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { WalletComicDto } from './dto/wallet-comic.dto';
import { RateComicDto } from './dto/rate-comic.dto';

@UseGuards(RestAuthGuard, ComicUpdateGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Comic')
@Controller('comic')
export class ComicController {
  constructor(private readonly comicService: ComicService) {}

  /* Create a new comic */
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateComicSwaggerDto })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'pfp', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  @Post('create')
  async create(
    @CreatorEntity() creator: Creator,
    @Body() createComicDto: CreateComicDto,
    @UploadedFiles({
      transform: (val) => plainToInstance(CreateComicFilesDto, val),
    })
    files: CreateComicFilesDto,
  ): Promise<ComicDto> {
    const comic = await this.comicService.create(
      creator.id,
      createComicDto,
      files,
    );

    const comicDto = plainToInstance(ComicDto, comic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Get all comics */
  @Get('get')
  async findAll(): Promise<ComicDto[]> {
    const comics = await this.comicService.findAll();
    const comicsDto = plainToInstance(ComicDto, comics);
    return await ComicDto.presignUrls(comicsDto);
  }

  /* Get wallets stats for a specific comic: star rating, favourite status etc. */
  @Get('get/:slug/my-stats')
  async findMyStats(
    @Param('slug') slug: string,
    @WalletEntity()
    wallet: Wallet,
  ): Promise<WalletComicDto | null> {
    const myComicStats = await this.comicService.findWalletComic(
      wallet.address,
      slug,
    );

    if (myComicStats) return plainToInstance(WalletComicDto, myComicStats);
    else {
      return {
        rating: null,
        isFavourite: false,
        isSubscribed: false,
      };
    }
  }

  /* Get specific comic by unique slug */
  @Get('get/:slug')
  async findOne(@Param('slug') slug: string): Promise<ComicDto> {
    const comic = await this.comicService.findOne(slug);
    const comicDto = plainToInstance(ComicDto, comic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Update specific comic */
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateComicDto: UpdateComicDto,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.update(slug, updateComicDto);
    const comicDto = plainToInstance(ComicDto, updatedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Update specific comics thumbnail file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @Patch('update/:slug/thumbnail')
  async updateThumbnail(
    @Param('slug') slug: string,
    @UploadedFile() thumbnail: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, thumbnail);
    const comicDto = plainToInstance(ComicDto, updatedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Update specific comics pfp file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('pfp')
  @UseInterceptors(FileInterceptor('pfp'))
  @Patch('update/:slug/pfp')
  async updatePfp(
    @Param('slug') slug: string,
    @UploadedFile() pfp: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, pfp);
    const comicDto = plainToInstance(ComicDto, updatedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Update specific comics logo file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('logo')
  @UseInterceptors(FileInterceptor('logo'))
  @Patch('update/:slug/logo')
  async updateLogo(
    @Param('slug') slug: string,
    @UploadedFile() logo: Express.Multer.File,
  ): Promise<ComicDto> {
    const updatedComic = await this.comicService.updateFile(slug, logo);
    const comicDto = plainToInstance(ComicDto, updatedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Rate specific comic */
  @Patch('rate/:slug')
  async rate(
    @Param('slug') slug: string,
    @Body() rateComicDto: RateComicDto,
    @WalletEntity() wallet: Wallet,
  ): Promise<WalletComicDto> {
    const myComicStats = await this.comicService.rate(
      wallet.address,
      slug,
      rateComicDto.rating,
    );
    return plainToInstance(WalletComicDto, myComicStats);
  }

  /* Subscribe/unsubscribe from specific comic */
  @Patch('subscribe/:slug')
  async subscribe(
    @Param('slug') slug: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<WalletComicDto> {
    const myComicStats = await this.comicService.toggleSubscribe(
      wallet.address,
      slug,
    );
    return plainToInstance(WalletComicDto, myComicStats);
  }

  /* Favouritise/unfavouritise a specific comic */
  @Patch('favouritise/:slug')
  async favouritise(
    @Param('slug') slug: string,
    @WalletEntity() wallet: Wallet,
  ): Promise<WalletComicDto> {
    const myComicStats = await this.comicService.toggleSubscribe(
      wallet.address,
      slug,
    );
    return plainToInstance(WalletComicDto, myComicStats);
  }

  /* Publish comic */
  @Patch('publish/:slug')
  async publish(@Param('slug') slug: string): Promise<ComicDto> {
    const publishedComic = await this.comicService.publish(slug);
    const comicDto = plainToInstance(ComicDto, publishedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Unpublish comic */
  @Patch('unpublish/:slug')
  async unpublish(@Param('slug') slug: string): Promise<ComicDto> {
    const unpublishedComic = await this.comicService.unpublish(slug);
    const comicDto = plainToInstance(ComicDto, unpublishedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Queue comic for deletion */
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string): Promise<ComicDto> {
    const deletedComic = await this.comicService.pseudoDelete(slug);
    const comicDto = plainToInstance(ComicDto, deletedComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Remove comic for deletion queue */
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string): Promise<ComicDto> {
    const recoveredComic = await this.comicService.pseudoRecover(slug);
    const comicDto = plainToInstance(ComicDto, recoveredComic);
    return await ComicDto.presignUrls(comicDto);
  }

  /* Completely remove specific comic, including files from s3 bucket */
  @Delete('remove/:slug')
  remove(@Param('slug') slug: string) {
    return this.comicService.remove(slug);
  }

  /**
   * TODO:
   * - email sending
   * - comicPages @ApiBody
   * - updatePages on comicIssue.service, comic-page.service.ts
   * - revise @Exclude and @Expose decorators
   */

  /**
   * TODO v1.2:
   * - prevent updating comics that are published
   * - reading metrics (most read etc. async update functions)
   * - [main.ts] API rate limiting: https://docs.nestjs.com/security/rate-limiting
   * - [main.ts] Config validation: https://wanago.io/2020/08/03/api-nestjs-uploading-public-files-to-amazon-s3/
   * - [password] Simulate message creation: const message = Message.from(signatureBytes);
   * - [nft.dto.ts] Decorate 'mint' property with @IsHash()?
   */

  /**
   * TODO v2:
   * - [s3] Move s3client.ts to s3.service.ts
   * - [auth] bcrypt.hash wallet.nonce
   * - [auth] TokenPayload revision
   */

  /**
   * TODO v3:
   * - [auth] Disconnect function to invalidate a token
   * - [services] Support renaming Creator, Comic, ComicIssue
   * - [config] Turn on "strictNullChecks" in tsconfig.ts
   */
}
