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
  CreateCreatorSwaggerDto,
  CreateCreatorDto,
  CreateCreatorFilesDto,
} from 'src/creator/dto/create-creator.dto';
import { UpdateCreatorDto } from 'src/creator/dto/update-creator.dto';
import { CreatorService } from './creator.service';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { CreatorDto } from './dto/creator.dto';
import { plainToInstance } from 'class-transformer';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { Wallet } from '@prisma/client';
import { ApiFile } from 'src/decorators/api-file.decorator';
import {
  CreatorIdParam,
  CreatorUpdateGuard,
} from 'src/guards/creator-update.guard';

@UseGuards(RestAuthGuard, CreatorUpdateGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Creator')
@Controller('creator')
export class CreatorController {
  constructor(private readonly creatorService: CreatorService) {}

  /* Create a new creator */
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCreatorSwaggerDto })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'avatar', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  @Post('create')
  async create(
    @WalletEntity() wallet: Wallet,
    @Body() createCreatorDto: CreateCreatorDto,
    @UploadedFiles({
      // Is this memory consuming?
      transform: (val) => plainToInstance(CreateCreatorFilesDto, val),
    })
    files: CreateCreatorFilesDto,
  ) {
    const creator = await this.creatorService.create(
      wallet.id,
      createCreatorDto,
      files,
    );
    const creatorDto = plainToInstance(CreatorDto, creator);
    return await CreatorDto.presignUrls(creatorDto);
  }

  /* Get all creators */
  @Get('get')
  async findAll(): Promise<CreatorDto[]> {
    const creators = await this.creatorService.findAll();
    const creatorsDto = plainToInstance(CreatorDto, creators);
    return await CreatorDto.presignUrls(creatorsDto);
  }

  /* Get specific creator by unique slug */
  @Get('get/:slug')
  async findOne(@Param('slug') slug: string): Promise<CreatorDto> {
    const creator = await this.creatorService.findOne(slug);
    const creatorDto = plainToInstance(CreatorDto, creator);
    return await CreatorDto.presignUrls(creatorDto);
  }

  /* Update specific creator */
  @CreatorIdParam({ key: 'slug', type: 'string' })
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateCreatorDto: UpdateCreatorDto,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.update(
      slug,
      updateCreatorDto,
    );
    const creatorDto = plainToInstance(CreatorDto, updatedCreator);
    return await CreatorDto.presignUrls(creatorDto);
  }

  /* Update specific creators thumbnail file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @CreatorIdParam({ key: 'slug', type: 'string' })
  @Patch('update/:slug/thumbnail')
  async updateThumbnail(
    @Param('slug') slug: string,
    @UploadedFile() thumbnail: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(
      slug,
      thumbnail,
    );
    const creatorDto = plainToInstance(CreatorDto, updatedCreator);
    return await CreatorDto.presignUrls(creatorDto);
  }

  /* Update specific creators avatar file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @CreatorIdParam({ key: 'slug', type: 'string' })
  @Patch('update/:slug/avatar')
  async updateAvatar(
    @Param('slug') slug: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(slug, avatar);
    const creatorDto = plainToInstance(CreatorDto, updatedCreator);
    return await CreatorDto.presignUrls(creatorDto);
  }

  /* Update specific creators banner file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('banner')
  @UseInterceptors(FileInterceptor('banner'))
  @CreatorIdParam({ key: 'slug', type: 'string' })
  @Patch('update/:slug/banner')
  async updateBanner(
    @Param('slug') slug: string,
    @UploadedFile() banner: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(slug, banner);
    const creatorDto = plainToInstance(CreatorDto, updatedCreator);
    return await CreatorDto.presignUrls(creatorDto);
  }

  /* Update specific creators logo file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('logo')
  @UseInterceptors(FileInterceptor('logo'))
  @CreatorIdParam({ key: 'slug', type: 'string' })
  @Patch('update/:slug/logo')
  async updateLogo(
    @Param('slug') slug: string,
    @UploadedFile() logo: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(slug, logo);
    const creatorDto = plainToInstance(CreatorDto, updatedCreator);
    return await CreatorDto.presignUrls(creatorDto);
  }

  /* Queue creator for deletion */
  @CreatorIdParam({ key: 'slug', type: 'string' })
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string): Promise<CreatorDto> {
    const deletedCreator = await this.creatorService.pseudoDelete(slug);
    const creatorDto = plainToInstance(CreatorDto, deletedCreator);
    return await CreatorDto.presignUrls(creatorDto);
  }

  /* Remove creator for deletion queue */
  @CreatorIdParam({ key: 'slug', type: 'string' })
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string): Promise<CreatorDto> {
    const recoveredCreator = await this.creatorService.pseudoRecover(slug);
    const creatorDto = plainToInstance(CreatorDto, recoveredCreator);
    return await CreatorDto.presignUrls(creatorDto);
  }

  /* Completely remove specific creator, including files from s3 bucket */
  @CreatorIdParam({ key: 'slug', type: 'string' })
  @Delete('remove/:slug')
  remove(@Param('slug') slug: string) {
    return this.creatorService.remove(slug);
  }
}
