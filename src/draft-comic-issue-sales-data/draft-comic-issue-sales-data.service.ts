import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDraftComicIssueSalesDataDto } from './dto/create-draft-comic-issue-sales-data.dto';
import { PrismaService } from 'nestjs-prisma';
import { UpdateDraftComicIssueSalesDataDto } from './dto/update-draft-comic-issue-sales-data.dto';

@Injectable()
export class DraftComicIssueSalesDataService {
  constructor(private readonly prisma: PrismaService) {}

  async throwIfPendingRequest(comicIssueId: number) {
    const comicIssue = await this.prisma.draftComicIssueSalesData.findFirst({
      where: { comicIssueId },
    });

    if (comicIssue) {
      throw new BadRequestException(
        `There is pending request for comic issue with id ${comicIssueId}`,
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
      throw new BadRequestException('Bad draft comic issue sales data');
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
        `Draft comic issue sales data with id ${id} does not exist`,
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
      throw new ForbiddenException(
        'Cannot update while your processing your data',
      );
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
