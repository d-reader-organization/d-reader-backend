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

@UseGuards(RestAuthGuard)
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
    @UploadedFiles() files: CreateCreatorFilesDto,
  ) {
    const creator = await this.creatorService.create(
      wallet.id,
      createCreatorDto,
      files,
    );
    return plainToInstance(CreatorDto, creator);
  }

  /* Get all creators */
  @Get('get')
  async findAll(): Promise<CreatorDto[]> {
    const creators = await this.creatorService.findAll();
    return plainToInstance(CreatorDto, creators);
  }

  /* Get specific creator by unique slug */
  @Get('get/:slug')
  async findOne(@Param('slug') slug: string): Promise<CreatorDto> {
    const creator = await this.creatorService.findOne(slug);
    return plainToInstance(CreatorDto, creator);
  }

  /* Update specific creator */
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateCreatorDto: UpdateCreatorDto,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.update(
      slug,
      updateCreatorDto,
    );
    return plainToInstance(CreatorDto, updatedCreator);
  }

  /* Update specific creators thumbnail file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @Patch('update/:slug/thumbnail')
  async updateThumbnail(
    @Param('slug') slug: string,
    @UploadedFile() thumbnail: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(
      slug,
      thumbnail,
    );
    return plainToInstance(CreatorDto, updatedCreator);
  }

  /* Update specific creators avatar file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @Patch('update/:slug/avatar')
  async updateAvatar(
    @Param('slug') slug: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(slug, avatar);
    return plainToInstance(CreatorDto, updatedCreator);
  }

  /* Update specific creators banner file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('banner')
  @UseInterceptors(FileInterceptor('banner'))
  @Patch('update/:slug/banner')
  async updateBanner(
    @Param('slug') slug: string,
    @UploadedFile() banner: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(slug, banner);
    return plainToInstance(CreatorDto, updatedCreator);
  }

  /* Update specific creators logo file */
  @ApiConsumes('multipart/form-data')
  @ApiFile('logo')
  @UseInterceptors(FileInterceptor('logo'))
  @Patch('update/:slug/logo')
  async updateLogo(
    @Param('slug') slug: string,
    @UploadedFile() logo: Express.Multer.File,
  ): Promise<CreatorDto> {
    const updatedCreator = await this.creatorService.updateFile(slug, logo);
    return plainToInstance(CreatorDto, updatedCreator);
  }

  // TODO v1.1: delete only creator if it's creator is the one from the jwt token
  // @UseGuards(EntityOwnershipGuard)
  // @EntityType(Creator)
  /* Queue creator for deletion */
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string): Promise<CreatorDto> {
    const deletedCreator = await this.creatorService.pseudoDelete(slug);
    return plainToInstance(CreatorDto, deletedCreator);
  }

  /* Remove creator for deletion queue */
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string): Promise<CreatorDto> {
    const recoveredCreator = await this.creatorService.pseudoRecover(slug);
    return plainToInstance(CreatorDto, recoveredCreator);
  }

  /* Completely remove specific creator, including files from s3 bucket */
  @Delete('remove/:slug')
  remove(@Param('slug') slug: string) {
    return this.creatorService.remove(slug);
  }
}
