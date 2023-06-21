import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
import { GenreDto, toGenreDto, toGenreDtoArray } from './dto/genre.dto';
import { plainToInstance } from 'class-transformer';
import { ApiFile } from 'src/decorators/api-file.decorator';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { Role } from '@prisma/client';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { GenreFilterParams } from './dto/genre-filter-params.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { memoizeThrottle } from 'src/utils/lodash';

@UseGuards(RestAuthGuard, RolesGuard, ThrottlerGuard)
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
    return toGenreDto(genre);
  }

  private throttledFindAll = memoizeThrottle(
    async (query: GenreFilterParams) => {
      const genres = await this.genreService.findAll(query);
      return toGenreDtoArray(genres);
    },
    24 * 60 * 60 * 1000, // 24 hours,
  );

  /* Get all genres */
  @Get('get')
  findAll(@Query() query: GenreFilterParams) {
    return this.throttledFindAll(query);
  }

  /* Get specific genre by unique slug */
  @Get('get/:slug')
  async findOne(@Param('slug') slug: string): Promise<GenreDto> {
    const genre = await this.genreService.findOne(slug);
    return toGenreDto(genre);
  }

  /* Update specific genre */
  @Roles(Role.Superadmin)
  @Patch('update/:slug')
  async update(
    @Param('slug') slug: string,
    @Body() updateGenreDto: UpdateGenreDto,
  ): Promise<GenreDto> {
    const updatedGenre = await this.genreService.update(slug, updateGenreDto);
    return toGenreDto(updatedGenre);
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
    const updatedGenre = await this.genreService.updateFile(slug, icon, 'icon');
    return toGenreDto(updatedGenre);
  }

  /* Pseudo delete genre */
  @Roles(Role.Superadmin)
  @Patch('delete/:slug')
  async pseudoDelete(@Param('slug') slug: string): Promise<GenreDto> {
    const deletedGenre = await this.genreService.pseudoDelete(slug);
    return toGenreDto(deletedGenre);
  }

  /* Recover genre */
  @Roles(Role.Superadmin)
  @Patch('recover/:slug')
  async pseudoRecover(@Param('slug') slug: string): Promise<GenreDto> {
    const recoveredGenre = await this.genreService.pseudoRecover(slug);
    return toGenreDto(recoveredGenre);
  }
}
