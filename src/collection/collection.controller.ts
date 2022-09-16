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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { RolesGuard, Roles } from 'src/guards/roles.guard';
import {
  CreateCollectionDto,
  CreateCollectionFilesDto,
} from 'src/collection/dto/create-collection.dto';
import {
  UpdateCollectionDto,
  UpdateCollectionFilesDto,
} from 'src/collection/dto/update-collection.dto';
import { CollectionService } from './collection.service';
import { Role } from '@prisma/client';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('Collection')
@ApiBearerAuth('JWT-auth')
@UseGuards(RestAuthGuard)
@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  /* Creates a new collection */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'pfp', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  @Post()
  create(
    @Body() createCollectionDto: CreateCollectionDto,
    @UploadedFiles() files: CreateCollectionFilesDto,
  ) {
    return this.collectionService.create({ ...createCollectionDto, ...files });
  }

  /* Get all collections */
  @Get()
  findAll() {
    return this.collectionService.findAll();
  }

  /* Get specific collection by unique id */
  @Get(':collectionName')
  findOne(@Param('collectionName') collectionName: string) {
    return this.collectionService.findOne(collectionName);
  }

  /* Update specific collection */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'pfp', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ]),
  )
  @Patch(':collectionName')
  update(
    @Param('collectionName') collectionName: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
    @UploadedFiles() files: UpdateCollectionFilesDto,
  ) {
    return this.collectionService.update(collectionName, {
      ...updateCollectionDto,
      ...files,
    });
  }

  /* Delete specific collection */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin)
  @Delete(':collectionName')
  remove(@Param('collectionName') collectionName: string) {
    return this.collectionService.remove(collectionName);
  }
}
