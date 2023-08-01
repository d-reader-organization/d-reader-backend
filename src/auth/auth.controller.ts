import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestAuthGuard } from '../guards/rest-auth.guard';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UserService } from '../user/user.service';
import { validateEmail, validateName } from '../utils/user';
import { UserEntity } from '../decorators/user.decorator';
import { LoginUserDto } from '../user/dto/login-user.dto';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { Authorization } from './dto/authorization.dto';
import { User } from '@prisma/client';

@UseGuards(ThrottlerGuard)
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
  ) {}

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
  async register(
    @Body() registerUserDto: RegisterUserDto,
  ): Promise<Authorization> {
    const user = await this.userService.register(registerUserDto);
    return this.authService.authorizeUser(user);
  }

  /* Login as a user */
  @Throttle(10, 60)
  @Post('user/login')
  async login(@Body() loginUserDto: LoginUserDto): Promise<Authorization> {
    const user = await this.userService.login(loginUserDto);
    return this.authService.authorizeUser(user);
  }

  /* Refresh access token */
  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @SkipThrottle()
  @Get('user/refresh-token/:refreshToken')
  reauthorize(
    @Param('refreshToken') refreshToken: string,
    @UserEntity()
    user: User,
  ) {
    return this.authService.refreshAccessToken(user, refreshToken);
  }

  @Throttle(10, 30)
  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
  /* Request a new one time password for your wallet to sign */
  @Patch('wallet/request-password/:address')
  requestPassword(@UserEntity() user: User) {
    return this.passwordService.generateOneTimePassword(user.id);
  }

  /* Connect your wallet with a signed and encoded one time password */
  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('wallet/connect/:address/:encoding')
  connectWallet(
    @Param('address') address: string,
    @Param('encoding') encoding: string,
    @UserEntity() user: User,
  ) {
    return this.authService.connectWallet(user.id, address, encoding);
  }

  /* Disconnect your wallet with a signed and encoded one time password */
  @UseGuards(RestAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('wallet/disconnect/:address')
  disconnectWallet(@Param('address') address: string) {
    return this.authService.disconnectWallet(address);
  }
}
