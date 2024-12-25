import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDraftComicIssueSalesDataDto } from './dto/create-draft-comic-issue-sales-data.dto';
import { PrismaService } from 'nestjs-prisma';
import { UpdateDraftComicIssueSalesDataDto } from './dto/update-draft-comic-issue-sales-data.dto';
import { ERROR_MESSAGES } from '../utils/errors';

@Injectable()
export class DraftComicIssueSalesDataService {
  constructor(private readonly prisma: PrismaService) {}

  async throwIfPendingRequest(comicIssueId: number) {
    const comicIssue = await this.prisma.draftComicIssueSalesData.findFirst({
      where: { comicIssueId },
    });

    if (comicIssue) {
      throw new BadRequestException(
        ERROR_MESSAGES.PENDING_ISSUE_REQUEST(comicIssueId),
      );
    }
  }

  async create(
    createDraftComicIssueSalesDataDto: CreateDraftComicIssueSalesDataDto,
  ) {
    await this.throwIfPendingRequest(
      createDraftComicIssueSalesDataDto.comicIssueId,
    );
    try {
      return await this.prisma.draftComicIssueSalesData.create({
        data: createDraftComicIssueSalesDataDto,
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException(ERROR_MESSAGES.BAD_DRAFT_ISSUE_DATA);
    }
  }

  async findOneOrThrow(id: number) {
    const draftComicIssueSalesData =
      await this.prisma.draftComicIssueSalesData.findUnique({
        where: {
          id,
        },
      });
    if (!draftComicIssueSalesData) {
      throw new NotFoundException(
        ERROR_MESSAGES.ISSUE_DRAFT_SALE_DATA_NOT_FOUND(id),
      );
    }

    return draftComicIssueSalesData;
  }

  async findOne(id: number) {
    return this.findOneOrThrow(id);
  }

  async update({
    id,
    updateDraftComicIssueSalesDataDto,
  }: {
    id: number;
    updateDraftComicIssueSalesDataDto: UpdateDraftComicIssueSalesDataDto;
  }) {
    const draftComicIssueSalesData = await this.findOneOrThrow(id);

    if (!!draftComicIssueSalesData.verifiedAt) {
      throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN_UPDATE);
    }
    return await this.prisma.draftComicIssueSalesData.update({
      data: updateDraftComicIssueSalesDataDto,
      where: { id },
    });
  }

  async delete(id: number) {
    await this.findOneOrThrow(id);
    await this.prisma.draftComicIssueSalesData.delete({ where: { id } });
  }
}
