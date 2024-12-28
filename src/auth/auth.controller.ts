import { Controller, Get, Post, Param, Patch, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { Throttle } from '@nestjs/throttler';
import { UserService } from '../user/user.service';
import {
  validateCreatorName,
  validateEmail,
  validateName,
} from '../utils/user';
import { LoginDto } from '../types/login.dto';
import { GoogleRegisterDto, RegisterDto } from '../types/register.dto';
import {
  Authorization,
  GoogleUserPayload,
  UserPayload,
} from './dto/authorization.dto';
import { CreatorService } from '../creator/creator.service';
import { UserAuth } from '../guards/user-auth.guard';
import { GoogleUserEntity, UserEntity } from '../decorators/user.decorator';
import { GoogleUserAuth } from '../guards/google-auth.guard';
import { ConnectWalletDto, SignedDataType } from './dto/connect-wallet.dto';
import { LOOSE_THROTTLER_CONFIG } from '../constants';

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
  @Throttle(LOOSE_THROTTLER_CONFIG)
  @Get('user/validate-name/:name')
  async validateUsername(@Param('name') name: string) {
    validateName(name);
    return await this.userService.throwIfNameTaken(name);
  }

  @GoogleUserAuth()
  @Patch(['user/google-login', 'user/login-with-google'])
  async googleLogin(
    @GoogleUserEntity() user: GoogleUserPayload,
  ): Promise<Authorization | boolean> {
    return await this.userService.handleGoogleSignIn(user);
  }

  /* Register a new google user */
  @GoogleUserAuth()
  @Post('user/register-with-google')
  async registerGoogleUser(
    @Body() googleRegisterDto: GoogleRegisterDto,
    @GoogleUserEntity() { email }: GoogleUserPayload,
  ): Promise<Authorization> {
    const user = await this.userService.register({
      ...googleRegisterDto,
      email,
      password: '',
    });
    return this.authService.authorizeUser(user);
  }

  @Throttle(LOOSE_THROTTLER_CONFIG)
  @Get('user/validate-email/:email')
  async validateUserEmail(@Param('email') email: string) {
    validateEmail(email);
    return await this.userService.throwIfEmailTaken(email);
  }

  /* Register a new user */
  @Post('user/register')
  async registerUser(@Body() registerDto: RegisterDto): Promise<Authorization> {
    const user = await this.userService.register(registerDto);
    return this.authService.authorizeUser(user);
  }

  /* Login as a user */
  @Patch('user/login')
  async loginUser(@Body() loginDto: LoginDto): Promise<Authorization> {
    const user = await this.userService.login(loginDto);
    return this.authService.authorizeUser(user);
  }

  /* Refresh access token */
  @Throttle(LOOSE_THROTTLER_CONFIG)
  @Patch('user/refresh-token/:refreshToken')
  async reauthorizeUser(@Param('refreshToken') refreshToken: string) {
    return await this.authService.refreshAccessToken(refreshToken);
  }

  // CREATOR ENDPOINTS
  @Throttle(LOOSE_THROTTLER_CONFIG)
  @Get('creator/validate-name/:name')
  async validateCreatorName(@Param('name') name: string) {
    validateCreatorName(name);
    return await this.creatorService.throwIfNameTaken(name);
  }

  @Throttle(LOOSE_THROTTLER_CONFIG)
  @Get('creator/validate-email/:email')
  async validateCreatorEmail(@Param('email') email: string) {
    validateEmail(email);
    return await this.creatorService.throwIfEmailTaken(email);
  }

  /* Register a new user */
  @Post('creator/register')
  async registerCreator(
    @Body() registerDto: RegisterDto,
  ): Promise<Authorization> {
    const creator = await this.creatorService.register(registerDto);
    return this.authService.authorizeCreator(creator);
  }

  /* Login as a user */
  @Patch('creator/login')
  async loginCreator(@Body() loginDto: LoginDto): Promise<Authorization> {
    const creator = await this.creatorService.login(loginDto);
    return this.authService.authorizeCreator(creator);
  }

  // Should this be an authorized endpoint? How do refresh tokens actually work??
  /* Refresh access token */
  @Throttle(LOOSE_THROTTLER_CONFIG)
  @Patch('creator/refresh-token/:refreshToken')
  async reauthorizeCreator(@Param('refreshToken') refreshToken: string) {
    return await this.authService.refreshAccessToken(refreshToken);
  }

  // WALLET ENDPOINTS
  @Throttle({ default: { limit: 10 } })
  @UserAuth()
  /* Request a new one time password for your wallet to sign */
  @Patch('wallet/request-password/:address')
  async requestPassword(@UserEntity() user: UserPayload) {
    return await this.passwordService.generateOneTimePassword(user.id);
  }

  /** @deprecated */
  @UserAuth()
  @Patch('wallet/connect/:address/:encoding')
  async connectWalletDeprecated(
    @Param('address') address: string,
    @Param('encoding') encoding: string,
    @UserEntity() user: UserPayload,
  ) {
    await this.authService.connectWallet(
      user.id,
      address,
      encoding,
      SignedDataType.Message,
    );
  }

  /* Connect your wallet with a signed and encoded one time password */
  @UserAuth()
  @Patch('wallet/connect')
  async connectWallet(
    @Body() connectWalletDto: ConnectWalletDto,
    @UserEntity() user: UserPayload,
  ) {
    const { address, encoding, signedDataType } = connectWalletDto;
    await this.authService.connectWallet(
      user.id,
      address,
      encoding,
      signedDataType,
    );
  }

  /* Disconnect your wallet */
  @UserAuth()
  @Patch('wallet/disconnect/:address')
  async disconnectWallet(@Param('address') address: string) {
    await this.authService.disconnectWallet(address);
  }
}
