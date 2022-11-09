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
  CreateGenreSwaggerDto,
  CreateGenreDto,
  CreateGenreFilesDto,
} from 'src/genre/dto/create-genre.dto';
import { GenreService } from './genre.service';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { GenreDto } from './dto/genre.dto';
import { plainToInstance } from 'class-transformer';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { Role } from '@prisma/client';
import { UpdateGenreDto } from './dto/update-genre.dto';

@UseGuards(RestAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Genre')
@Controller('genre')
export class GenreController {
  constructor(private readonly genreService: GenreService) {}

  /* Create a new genre */
  @Roles(Role.Superadmin)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateGenreSwaggerDto })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'icon', maxCount: 1 }]))
  @Post('create')
  async create(
    @Body() createGenreDto: CreateGenreDto,
    @UploadedFiles({
      transform: (val) => plainToInstance(CreateGenreFilesDto, val),
    })
    files: CreateGenreFilesDto,
  ): Promise<GenreDto> {
    const genre = await this.genreService.create(createGenreDto, files);
    const genreDto = plainToInstance(GenreDto, genre);
    return GenreDto.presignUrls(genreDto);
  }

  /* Get all genres */
  @Get('get')
  async findAll(): Promise<GenreDto[]> {
    const genres = await this.genreService.findAll();
    const genresDto = plainToInstance(GenreDto, genres);
    return GenreDto.presignUrls(genresDto);
  }

  /* Get specific genre by unique slug */
  @Get('get/:slug')
  async findOne(@Param('slug') slug: string): Promise<GenreDto> {
    const genre = await this.genreService.findOne(slug);
    const genreDto = plainToInstance(GenreDto, genre);
    return GenreDto.presignUrls(genreDto);
  }

  /* Update specific genre */
  @Roles(Role.Superadmin)
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateGenreDto: UpdateGenreDto,
  ): Promise<GenreDto> {
    const updatedGenre = await this.genreService.update(slug, updateGenreDto);
    const genreDto = plainToInstance(GenreDto, updatedGenre);
    return GenreDto.presignUrls(genreDto);
  }

  /* Update specific genres icon file */
  @Roles(Role.Superadmin)
  @ApiConsumes('multipart/form-data')
  @ApiFile('icon')
  @UseInterceptors(FileInterceptor('icon'))
  @Patch('update/:slug/icon')
  async updateIcon(
    @Param('slug') slug: string,
    @UploadedFile() icon: Express.Multer.File,
  ): Promise<GenreDto> {
    const updatedGenre = await this.genreService.updateFile(slug, icon);
    const comicDto = plainToInstance(GenreDto, updatedGenre);
    return GenreDto.presignUrls(comicDto);
  }

  /* Pseudo delete genre */
  @Roles(Role.Superadmin)
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string): Promise<GenreDto> {
    const deletedGenre = await this.genreService.pseudoDelete(slug);
    const genreDto = plainToInstance(GenreDto, deletedGenre);
    return GenreDto.presignUrls(genreDto);
  }

  /* Recover genre */
  @Roles(Role.Superadmin)
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string): Promise<GenreDto> {
    const recoveredGenre = await this.genreService.pseudoRecover(slug);
    const genreDto = plainToInstance(GenreDto, recoveredGenre);
    return GenreDto.presignUrls(genreDto);
  }

  /* Completely remove specific genre, including files from s3 bucket */
  @Delete('remove/:slug')
  @Roles(Role.Superadmin)
  remove(@Param('slug') slug: string) {
    return this.genreService.remove(slug);
  }
}
