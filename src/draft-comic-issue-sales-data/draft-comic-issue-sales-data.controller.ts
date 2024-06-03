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
import { DraftComicIssueSalesDataService } from './draft-comic-issue-sales-data.service';
import { CreateDraftComicIssueSalesDataDto } from './dto/create-draft-comic-issue-sales-data.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { UpdateDraftComicIssueSalesDataDto } from './dto/update-draft-comic-issue-sales-data.dto';
import { DraftComicIssueSalesDataAuth } from 'src/guards/draft-comic-issue-auth.guard';
import { toDraftComicIssueSalesDataDto } from './dto/draft-comic-issue-sales-data.dto';

@UseGuards(ThrottlerGuard)
@ApiTags('Draft Comic Issue Sales Data')
@Controller('draft-comic-issue-sales-data')
export class DraftComicIssueSalesDataController {
  constructor(
    private readonly draftComicIssueSalesDataService: DraftComicIssueSalesDataService,
  ) {}

  @DraftComicIssueSalesDataAuth()
  @Post('create')
  async create(
    @Body()
    createDraftComicIssueSalesDataDto: CreateDraftComicIssueSalesDataDto,
  ) {
    const draftComicIssueSalesData =
      await this.draftComicIssueSalesDataService.create(
        createDraftComicIssueSalesDataDto,
      );
    return toDraftComicIssueSalesDataDto(draftComicIssueSalesData);
  }

  @DraftComicIssueSalesDataAuth()
  @Get('get/:id')
  async findOne(@Param('id') id: string) {
    const draftComicIssueSalesData =
      await this.draftComicIssueSalesDataService.findOne(+id);
    return toDraftComicIssueSalesDataDto(draftComicIssueSalesData);
  }

  @DraftComicIssueSalesDataAuth()
  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body()
    updateDraftComicIssueSalesDataDto: UpdateDraftComicIssueSalesDataDto,
  ) {
    const updatedDraftComicIssueSalesData =
      await this.draftComicIssueSalesDataService.update({
        id: +id,
        updateDraftComicIssueSalesDataDto,
      });
    return toDraftComicIssueSalesDataDto(updatedDraftComicIssueSalesData);
  }

  @DraftComicIssueSalesDataAuth()
  @Delete('delete/:id')
  delete(@Param('id') id: string) {
    return this.draftComicIssueSalesDataService.delete(+id);
  }
}
