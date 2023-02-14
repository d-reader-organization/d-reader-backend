import { Keypair } from '@solana/web3.js';
import { Command, CommandRunner } from 'nest-commander';
import { PasswordService } from '../auth/password.service';
import { AuthService } from '../auth/auth.service';
import { cb, cg, log, logErr } from './chalk';
import { decodeUTF8 } from 'tweetnacl-util';
import * as Utf8 from 'crypto-js/enc-utf8';
import * as AES from 'crypto-js/aes';
import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';

@Command({
  name: 'authorize-wallet',
  description: 'Authorize a specific wallet and obtain the JWT token',
})
export class AuthorizeWalletCommand extends CommandRunner {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly authService: AuthService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.authorizeWallet();
  }

  async authorizeWallet() {
    log('🏗️  Starting wallet authorization...');
    const wallet = AES.decrypt(
      process.env.TREASURY_PRIVATE_KEY,
      process.env.TREASURY_SECRET,
    );

    const keypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(wallet.toString(Utf8))),
    );
    const address = keypair.publicKey.toBase58();
    const otp = await this.passwordService.generateOneTimePassword(address);
    const messageBytes = decodeUTF8(otp);
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
    const encoding = bs58.encode(signature);
    const authorization = await this.authService.connect(address, encoding);

    log(cg('✅  Authorization successful!'));
    log(cb('🔐  JWT token: '), authorization.accessToken);
    try {
    } catch (e) {
      logErr('Failed to authorize the walet');
    }
  }
}
