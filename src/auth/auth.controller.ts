import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UserService } from '../user/user.service';
import { validateEmail, validateName } from '../utils/user';
import { LoginDto } from '../types/login.dto';
import { RegisterDto } from '../types/register.dto';
import {
  Authorization,
  CreatorPayload,
  UserPayload,
} from './dto/authorization.dto';
import { CreatorService } from '../creator/creator.service';
import { UserAuth } from '../guards/user-auth.guard';
import { CreatorAuth } from '../guards/creator-auth.guard';
import { UserEntity } from '../decorators/user.decorator';
import { CreatorEntity } from '../decorators/creator.decorator';

@UseGuards(ThrottlerGuard)
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly creatorService: CreatorService,
    private readonly passwordService: PasswordService,
  ) {}

  // USER ENDPOINTS
  @SkipThrottle()
  @Get('user/validate-name/:name')
  validateUserName(@Param('name') name: string) {
    validateName(name);
    return this.userService.throwIfNameTaken(name);
  }

  @SkipThrottle()
  @Get('user/validate-email/:email')
  validateUserEmail(@Param('email') email: string) {
    validateEmail(email);
    return this.userService.throwIfEmailTaken(email);
  }

  /* Register a new user */
  @Throttle(10, 60)
  @Post('user/register')
  async registerUser(@Body() registerDto: RegisterDto): Promise<Authorization> {
    const user = await this.userService.register(registerDto);
    return this.authService.authorizeUser(user);
  }

  /* Login as a user */
  @Throttle(10, 60)
  @Post('user/login')
  async loginUser(@Body() loginDto: LoginDto): Promise<Authorization> {
    const user = await this.userService.login(loginDto);
    return this.authService.authorizeUser(user);
  }

  /* Refresh access token */
  @UserAuth()
  @SkipThrottle()
  @Get('user/refresh-token/:refreshToken')
  reauthorizeUser(
    @Param('refreshToken') refreshToken: string,
    @UserEntity()
    user: UserPayload,
  ) {
    return this.authService.refreshAccessToken(user, refreshToken);
  }

  // CREATOR ENDPOINTS
  @SkipThrottle()
  @Get('creator/validate-name/:name')
  validateCreatorName(@Param('name') name: string) {
    validateName(name);
    return this.creatorService.throwIfNameTaken(name);
  }

  @SkipThrottle()
  @Get('creator/validate-email/:email')
  validateCreatorEmail(@Param('email') email: string) {
    validateEmail(email);
    return this.creatorService.throwIfEmailTaken(email);
  }

  /* Register a new user */
  @Throttle(10, 60)
  @Post('creator/register')
  async registerCreator(
    @Body() registerDto: RegisterDto,
  ): Promise<Authorization> {
    const creator = await this.creatorService.register(registerDto);
    return this.authService.authorizeCreator(creator);
  }

  /* Login as a user */
  @Throttle(10, 60)
  @Post('creator/login')
  async loginCreator(@Body() loginDto: LoginDto): Promise<Authorization> {
    const creator = await this.creatorService.login(loginDto);
    return this.authService.authorizeCreator(creator);
  }

  /* Refresh access token */
  @CreatorAuth()
  @SkipThrottle()
  @Get('creator/refresh-token/:refreshToken')
  reauthorizeCreator(
    @Param('refreshToken') refreshToken: string,
    @CreatorEntity()
    creator: CreatorPayload,
  ) {
    return this.authService.refreshAccessToken(creator, refreshToken);
  }

  // WALLET ENDPOINTS
  @Throttle(10, 30)
  @UserAuth()
  /* Request a new one time password for your wallet to sign */
  @Patch('wallet/request-password/:address')
  requestPassword(@UserEntity() user: UserPayload) {
    return this.passwordService.generateOneTimePassword(user.id);
  }

  /* Connect your wallet with a signed and encoded one time password */
  @UserAuth()
  @Get('wallet/connect/:address/:encoding')
  connectWallet(
    @Param('address') address: string,
    @Param('encoding') encoding: string,
    @UserEntity() user: UserPayload,
  ) {
    return this.authService.connectWallet(user.id, address, encoding);
  }

  /* Disconnect your wallet with a signed and encoded one time password */
  @UserAuth()
  @Get('wallet/disconnect/:address')
  disconnectWallet(@Param('address') address: string) {
    return this.authService.disconnectWallet(address);
  }
}
