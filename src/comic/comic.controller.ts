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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { RolesGuard, Roles } from 'src/guards/roles.guard';
import { ComicService } from './comic.service';
import { CreateComicDto, CreateComicFilesDto } from './dto/create-comic.dto';
import { UpdateComicDto, UpdateComicFilesDto } from './dto/update-comic.dto';
import { Role } from '@prisma/client';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('Comic')
@ApiBearerAuth('JWT-auth')
@UseGuards(RestAuthGuard)
@Controller('comic')
export class ComicController {
  constructor(private readonly comicService: ComicService) {}

  // https://github.com/swagger-api/swagger-ui/issues/7625
  /* Creates a new comic */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover', maxCount: 1 },
      { name: 'soundtrack', maxCount: 1 },
      // { name: 'pages', maxCount: 1 },
      // TODO: page.image
      // TODO: page.altImage
    ]),
  )
  @Post()
  create(
    @Body() createComicDto: CreateComicDto,
    @UploadedFiles() files: CreateComicFilesDto,
    @Req() req,
  ) {
    console.log('req: ', req);
    return this.comicService.create({ ...createComicDto, ...files });
  }

  /* Get all comics */
  @Get()
  findAll() {
    return this.comicService.findAll();
  }

  /* Get specific comic by unique id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comicService.findOne(+id);
  }

  /* Update specific comic */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      // TODO: validate file sizes and extensions
      { name: 'cover', maxCount: 1 },
      { name: 'soundtrack', maxCount: 1 },
      // TODO: page.image
      // TODO: page.altImage
    ]),
  )
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateComicDto: UpdateComicDto,
    @UploadedFiles() files: UpdateComicFilesDto,
  ) {
    return this.comicService.update(+id, { ...updateComicDto, ...files });
  }

  /* Delete specific comic */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comicService.remove(+id);
  }
}
