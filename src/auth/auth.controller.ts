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
import { Authorization, UserPayload } from './dto/authorization.dto';
import { CreatorService } from '../creator/creator.service';
import { UserAuth } from '../guards/user-auth.guard';
import { UserEntity } from '../decorators/user.decorator';

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
  async validateUserName(@Param('name') name: string) {
    validateName(name);
    return await this.userService.throwIfNameTaken(name);
  }

  @SkipThrottle()
  @Get('user/validate-email/:email')
  async validateUserEmail(@Param('email') email: string) {
    validateEmail(email);
    return await this.userService.throwIfEmailTaken(email);
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
  @Patch('user/login')
  async loginUser(@Body() loginDto: LoginDto): Promise<Authorization> {
    const user = await this.userService.login(loginDto);
    return this.authService.authorizeUser(user);
  }

  /* Refresh access token */
  @SkipThrottle()
  @Get('user/refresh-token/:refreshToken')
  async reauthorizeUser(@Param('refreshToken') refreshToken: string) {
    return await this.authService.refreshAccessToken(refreshToken);
  }

  // CREATOR ENDPOINTS
  @SkipThrottle()
  @Get('creator/validate-name/:name')
  async validateCreatorName(@Param('name') name: string) {
    validateName(name);
    return await this.creatorService.throwIfNameTaken(name);
  }

  @SkipThrottle()
  @Get('creator/validate-email/:email')
  async validateCreatorEmail(@Param('email') email: string) {
    validateEmail(email);
    return await this.creatorService.throwIfEmailTaken(email);
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
  @Patch('creator/login')
  async loginCreator(@Body() loginDto: LoginDto): Promise<Authorization> {
    const creator = await this.creatorService.login(loginDto);
    return this.authService.authorizeCreator(creator);
  }

  // TODO: revise how refresh tokens should actually work (authorized endpoint?)
  /* Refresh access token */
  @SkipThrottle()
  @Get('creator/refresh-token/:refreshToken')
  async reauthorizeCreator(@Param('refreshToken') refreshToken: string) {
    return await this.authService.refreshAccessToken(refreshToken);
  }

  // WALLET ENDPOINTS
  @Throttle(10, 30)
  @UserAuth()
  /* Request a new one time password for your wallet to sign */
  @Get('wallet/request-password/:address')
  async requestPassword(@UserEntity() user: UserPayload) {
    return await this.passwordService.generateOneTimePassword(user.id);
  }

  /* Connect your wallet with a signed and encoded one time password */
  @UserAuth()
  @Get('wallet/connect/:address/:encoding')
  async connectWallet(
    @Param('address') address: string,
    @Param('encoding') encoding: string,
    @UserEntity() user: UserPayload,
  ) {
    await this.authService.connectWallet(user.id, address, encoding);
  }

  /* Disconnect your wallet with a signed and encoded one time password */
  @UserAuth()
  @Get('wallet/disconnect/:address')
  async disconnectWallet(@Param('address') address: string) {
    await this.authService.disconnectWallet(address);
  }
}
