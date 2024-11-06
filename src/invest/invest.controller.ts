import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExpressInterestDto } from './dto/express-interest.dto';
import { InvestService } from './invest.service';
import { UserEntity } from '../decorators/user.decorator';
import { UserPayload } from '../auth/dto/authorization.dto';
import { UserAuth } from 'src/guards/user-auth.guard';
import { OptionalUserAuth } from 'src/guards/optional-user-auth.guard';

@ApiTags('Invest')
@Controller('invest')
export class InvestController {
  constructor(private readonly investService: InvestService) {}
  @UserAuth()
  @Post('/express-interest/:slug')
  async expressInterest(
    @Param('slug') slug: string,
    @Body() expressInterestDto: ExpressInterestDto,
    @UserEntity() user: UserPayload,
  ) {
    const { transaction, expressedAmount } = expressInterestDto;
    return this.investService.expressUserInterest(
      transaction,
      slug,
      expressedAmount,
      user.id,
    );
  }

  @Get('/get')
  async findAll() {
    return this.investService.findAllInvestProjects();
  }

  @OptionalUserAuth()
  @Get('/get/:projectSlug')
  async findOne(
    @Param('projectSlug') projectSlug: string,
    @UserEntity() user?: UserPayload,
  ) {
    const userId = user ? user.id : null;
    return this.investService.findOneInvestProject(projectSlug, userId);
  }
}
