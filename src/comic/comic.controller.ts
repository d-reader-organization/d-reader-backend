import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { RolesGuard, Roles } from 'src/guards/roles.guard';
import { ComicService } from './comic.service';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';
import { Role } from '@prisma/client';

@ApiTags('Comic')
@ApiBearerAuth('JWT-auth')
@UseGuards(RestAuthGuard)
@Controller('comic')
export class ComicController {
  constructor(private readonly comicService: ComicService) {}

  /* Creates a new comic */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @Post()
  create(@Body() createComicDto: CreateComicDto) {
    return this.comicService.create(createComicDto);
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
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateComicDto: UpdateComicDto) {
    return this.comicService.update(+id, updateComicDto);
  }

  /* Delete specific comic */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comicService.remove(+id);
  }
}
