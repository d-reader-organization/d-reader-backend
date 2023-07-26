import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { NonceService } from './nonce.service';
import { AddTransactionParams } from './dto/add-transaction-params.dto';
import { NonceTransactionParams } from './dto/cancel-transaction-params.dto';

@UseGuards(RestAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Nonce')
@Controller('nonce')
export class NonceController {
  constructor(private readonly nonceService: NonceService) {}

  @Post('add-transaction')
  async addTransaction(@Query() query: AddTransactionParams) {
    await this.nonceService.addTransaction(query.queueName, query.serializedTx);
  }

  @Post('nonce-transaction')
  async handleNonceTransaction(@Query() query: NonceTransactionParams) {
    await this.nonceService.updateNonce(query.serializedTx, query.isCancelled);
  }
}
