import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExpressInterestDto } from './dto/express-interest.dto';
import { InvestService } from './invest.service';
import { UserEntity } from '../decorators/user.decorator';
import { UserPayload } from '../auth/dto/authorization.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { OptionalUserAuth } from 'src/guards/optional-user-auth.guard';
import { toProjectDto, toProjectDtoArray } from './dto/project.dto';
import { toUserInterestedReceiptDtoArray } from './dto/userInterestedReceipt.dto';
import { CacheInterceptor } from '../cache/cache.interceptor';
import { minutes } from '@nestjs/throttler';
import { ReferralCampaignReceiptParams } from './dto/referral-campaign-receipt-params.dto';
import { toProjectReferralCampaignReceiptDtoArray } from './dto/project-referral-campaign-receipt.dto';

@ApiTags('Invest')
@Controller('invest')
export class InvestController {
  constructor(private readonly investService: InvestService) {}

  @UserAuth()
  @Patch('/express-interest/:slug')
  async expressInterest(
    @Param('slug') slug: string,
    @Body() expressInterestDto: ExpressInterestDto,
    @UserEntity() user: UserPayload,
  ) {
    const { ref, expressedAmount } = expressInterestDto;
    return await this.investService.expressUserInterest(
      slug,
      expressedAmount,
      user.id,
      ref,
    );
  }

  @UseInterceptors(CacheInterceptor({ ttl: minutes(10) }))
  @Get('/get')
  async findAll() {
    const projects = await this.investService.findAllInvestProjects();
    return toProjectDtoArray(projects);
  }

  @OptionalUserAuth()
  @Get('/get/:projectSlug')
  async findOne(
    @Param('projectSlug') projectSlug: string,
    @UserEntity() user?: UserPayload,
  ) {
    const userId = user ? user.id : null;

    const project = await this.investService.findOneInvestProject(
      projectSlug,
      userId,
    );
    return toProjectDto(project);
  }

  @Get('/get/:projectSlug/interest-receipts')
  async find(@Param('projectSlug') projectSlug: string) {
    const receipts = await this.investService.findUserInterestedReceipts(
      projectSlug,
    );
    return toUserInterestedReceiptDtoArray(receipts);
  }

  @UserAuth()
  @Get('/referral-campaign/receipt/get')
  async findAllReferralCampaignReceipts(
    @Query() query: ReferralCampaignReceiptParams,
    @UserEntity() user: UserPayload,
  ) {
    const receipts = await this.investService.findAllReferralCampaignReceipts(
      query,
      user.id,
    );
    return toProjectReferralCampaignReceiptDtoArray(receipts);
  }
}
