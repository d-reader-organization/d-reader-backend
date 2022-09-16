import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { RolesGuard, Roles } from 'src/guards/roles.guard';
import { RestAuthGuard } from 'src/guards/rest-auth.guard';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { WalletEntity } from 'src/decorators/wallet.decorator';
import { Wallet } from './entities/wallet.entity';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Wallet')
@ApiBearerAuth('JWT-auth')
@UseGuards(RestAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /* Creates a new user */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @Post()
  create(@Body() createWalletDto: CreateWalletDto) {
    return this.walletService.create(createWalletDto);
  }

  /* Get user data from auth token */
  @Get('me')
  findMe(
    @WalletEntity()
    wallet: Wallet,
  ): Wallet {
    return wallet;
  }

  /* Get all users */
  @Get()
  findAll() {
    return this.walletService.findAll();
  }

  /* Get specific user by unique name */
  @Get(':address')
  findOne(@Param('address') address: string) {
    return this.walletService.findOne(address);
  }

  /* Update specific user */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  @Patch(':address')
  update(
    @Param('address') address: string,
    @Body() updateWalletDto: UpdateWalletDto,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    return this.walletService.update(address, { ...updateWalletDto, avatar });
  }

  /* Delete specific user */
  @UseGuards(RolesGuard)
  @Roles(Role.Superadmin, Role.Admin)
  @Delete(':address')
  remove(@Param('address') address: string) {
    return this.walletService.remove(address);
  }
}
