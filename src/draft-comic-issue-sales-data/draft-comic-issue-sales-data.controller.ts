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
import { CreatorPayload } from 'src/auth/dto/authorization.dto';
import { CreatorEntity } from 'src/decorators/creator.decorator';
import { DraftComicIssueSalesDataAuth } from 'src/guards/draft-comic-issue-auth.guard';

@UseGuards(ThrottlerGuard)
@ApiTags('Draft Comic Issue Sales Data')
@Controller('draft-comic-issue-sales-data')
export class DraftComicIssueSalesDataController {
  constructor(
    private readonly draftComicIssueSalesDataService: DraftComicIssueSalesDataService,
  ) {}

  @DraftComicIssueSalesDataAuth()
  @Post('create')
  create(
    @Body()
    createDraftComicIssueSalesDataDto: CreateDraftComicIssueSalesDataDto,
  ) {
    return this.draftComicIssueSalesDataService.create(
      createDraftComicIssueSalesDataDto,
    );
  }

  @DraftComicIssueSalesDataAuth()
  @Get('get/:id')
  findOne(@Param('id') id: string, @CreatorEntity() creator: CreatorPayload) {
    return this.draftComicIssueSalesDataService.findOne(+id);
  }

  @DraftComicIssueSalesDataAuth()
  @Patch('update/:id')
  update(
    @Param('id') id: string,
    @Body()
    updateDraftComicIssueSalesDataDto: UpdateDraftComicIssueSalesDataDto,
  ) {
    return this.draftComicIssueSalesDataService.update({
      id: +id,
      updateDraftComicIssueSalesDataDto,
    });
  }

  @DraftComicIssueSalesDataAuth()
  @Delete('delete/:id')
  delete(@Param('id') id: string, @CreatorEntity() creator: CreatorPayload) {
    return this.draftComicIssueSalesDataService.delete(+id);
  }
}
