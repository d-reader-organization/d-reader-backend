import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { ComicIssueService } from './comic-issue.service';
import {
  ComicIssueDto,
  toComicIssueDto,
  toComicIssueDtoArray,
} from './dto/comic-issue.dto';
import { PayloadEntity } from 'src/decorators/payload.decorator';
import { ComicIssueParams } from './dto/comic-issue-params.dto';
import { UserComicIssueService } from './user-comic-issue.service';
import { RateComicDto } from 'src/comic/dto/rate-comic.dto';
import {
  ComicPageDto,
  toComicPageDtoArray,
} from '../comic-page/entities/comic-page.dto';
import { PublishOnChainDto } from './dto/publish-on-chain.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  OwnedComicIssueDto,
  toOwnedComicIssueDtoArray,
} from './dto/owned-comic-issue.dto';
import { JwtPayload } from 'src/auth/dto/authorization.dto';
import { Role } from '@prisma/client';

@UseGuards(RestAuthGuard, RolesGuard, ThrottlerGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Comic Issue')
@Controller('comic-issue')
export class ComicIssueUserController {
  constructor(
    private readonly comicIssueService: ComicIssueService,
    private readonly userComicIssueService: UserComicIssueService,
  ) {}

  /* Get all comic issues */
  @Get('get')
  async findAll(@Query() query: ComicIssueParams): Promise<ComicIssueDto[]> {
    const comicIssues = await this.comicIssueService.findAll(query);
    return toComicIssueDtoArray(comicIssues);
  }

  @Get('get/by-owner/:id')
  async findOwnedComicIssues(
    @Param('id') id: string,
    @Query() query: ComicIssueParams,
  ): Promise<OwnedComicIssueDto[]> {
    const comicIssues = await this.comicIssueService.findAllByOwner(query, +id);
    return toOwnedComicIssueDtoArray(comicIssues);
  }

  /* Get specific comic issue by unique id */
  @Get('get/:id')
  async findOne(
    @Param('id') id: string,
    @PayloadEntity() user: JwtPayload,
  ): Promise<ComicIssueDto> {
    const comicIssue = await this.comicIssueService.findOne(+id, user.id);
    return toComicIssueDto(comicIssue);
  }

  /* Get specific comic issue's pages */
  @Get('get/:id/pages')
  async getPages(
    @Param('id') id: string,
    @PayloadEntity() user: JwtPayload,
  ): Promise<ComicPageDto[]> {
    const pages = await this.comicIssueService.getPages(+id, user.id);
    return toComicPageDtoArray(pages);
  }

  /* Favouritise/unfavouritise a specific comic issue */
  @Patch('favouritise/:id')
  favouritise(@Param('id') id: string, @PayloadEntity() user: JwtPayload) {
    this.userComicIssueService.toggleState(user.id, +id, 'isFavourite');
  }

  /* Rate specific comic issue */
  @Patch('rate/:id')
  rate(
    @Param('id') id: string,
    @Body() rateComicDto: RateComicDto,
    @PayloadEntity() user: JwtPayload,
  ) {
    this.userComicIssueService.rate(user.id, +id, rateComicDto.rating);
  }

  /* Read a specific comic issue */
  @Patch('read/:id')
  read(@Param('id') id: string, @PayloadEntity() user: JwtPayload) {
    this.comicIssueService.read(+id, user.id);
  }

  /* Publish an off-chain comic issue on chain */
  @Roles(Role.Superadmin, Role.Admin)
  @Patch('publish-on-chain/:id')
  async publishOnChain(
    @Param('id') id: string,
    @Body() publishOnChainDto: PublishOnChainDto,
  ): Promise<ComicIssueDto> {
    const publishedComicIssue = await this.comicIssueService.publishOnChain(
      +id,
      publishOnChainDto,
    );
    return toComicIssueDto(publishedComicIssue);
  }

  /* Publish comic issue */
  @Roles(Role.Superadmin, Role.Admin)
  @Patch('publish-off-chain/:id')
  async publishOffChain(@Param('id') id: string): Promise<ComicIssueDto> {
    const publishedComicIssue = await this.comicIssueService.publishOffChain(
      +id,
    );
    return toComicIssueDto(publishedComicIssue);
  }

  /* Unpublish comic issue */
  @Roles(Role.Superadmin, Role.Admin)
  @Patch('unpublish/:id')
  async unpublish(@Param('id') id: string): Promise<ComicIssueDto> {
    throw new ForbiddenException(`Endpoint disabled, cannot unpublish ${id}`);
    // const unpublishedComicIssue = await this.comicIssueService.unpublish(+id);
    // return toComicIssueDto(unpublishedComicIssue);
  }
}
