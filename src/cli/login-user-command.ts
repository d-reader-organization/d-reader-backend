import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { LoginDto } from '../../src/types/login.dto';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../user/user.service';
import { cb, cg, log, logErr } from './chalk';

interface Options {
  nameOrEmail: string;
  password: string;
}

@Command({
  name: 'login-user',
  description: 'Login as a specific user and obtain the JWT token',
})
export class LoginUserCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('login-user', options);
    await this.login(options);
  }

  async login(loginDto: LoginDto) {
    log('🏗️  Starting user authorization...');
    try {
      const user = await this.userService.login(loginDto);
      const authorization = this.authService.authorizeUser(user);

      log(cg('✅ Authorization successful!'));
      log(cg('👛  User: ') + user);
      log(cb('🔐  JWT token: '), authorization.accessToken);
    } catch (e) {
      logErr('Failed to authorize the user\n' + e);
    }
  }
}
