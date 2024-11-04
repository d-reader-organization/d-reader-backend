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
  @Post('/express-interest')
  async expressInterest(
    @Body() expressInterestDto: ExpressInterestDto,
    @UserEntity() user: UserPayload,
  ) {
    const { transactionSignature, projectId } = expressInterestDto;
    return this.investService.expressUserInterest(
      transactionSignature,
      projectId,
      user.id,
    );
  }

  @Get('/get')
  async findAll() {
    return this.investService.findAllInvestProjects();
  }

  @OptionalUserAuth()
  @Get('/get/:projectId')
  async findOne(
    @Param('projectId') projectId: number,
    @UserEntity() user?: UserPayload,
  ) {
    const userId = user ? user.id : null;
    return this.investService.findOneInvestProject(projectId, userId);
  }
}
