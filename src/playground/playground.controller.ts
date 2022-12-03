import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuctionHouseService } from 'src/vendors/auction-house.service';
import { CandyMachineService } from 'src/vendors/candy-machine.service';

@UseGuards(RestAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Playground')
@Controller('playground')
export class PlaygroundController {
  constructor(
    private readonly candyMachineService: CandyMachineService,
    private readonly auctionHouseService: AuctionHouseService,
  ) {}

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Post('find-minted-nfts')
  async findMintedNfts() {
    return await this.candyMachineService.findMintedNfts();
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Post('create-candy-machine')
  async createCandyMachine() {
    return await this.candyMachineService.create();
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Post('mint-one')
  async mintOne() {
    return await this.candyMachineService.mintOne();
  }

  /* WORK IN PROGRESS - proof of concept endpoint */
  @Post('create-auction-house')
  async createAuctionHouse() {
    return await this.auctionHouseService.create();
  }
}
