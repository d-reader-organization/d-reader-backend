import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  async addTransaction(@Body() query: AddTransactionParams) {
    await this.nonceService.addTransaction(query.queueName, query.serializedTx);
  }

  @Post('nonce-transaction')
  async handleNonceTransaction(@Body() query: NonceTransactionParams) {
    await this.nonceService.updateMultipleNonce(
      query.serializedTx,
      query.isCancelled,
    );
  }

  @Get('create-queue/:name')
  async createQueue(@Param('name') name: string) {
    this.nonceService.createQueue(name);
  }
}
