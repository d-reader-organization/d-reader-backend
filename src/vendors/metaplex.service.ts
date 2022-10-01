import { Injectable } from '@nestjs/common';
import { Connection, ParsedAccountData } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class MetaplexService {
  private readonly connection: Connection;

  constructor(private readonly prisma: PrismaService) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_NODE_ENDPOINT,
      'confirmed',
    );
  }

  /** Check whether wallet address owns atleast one NFT from the hashlist
   * @param {string} address - wallet address to verify if it's a holder
   * @param {string[]} hashlist - list of whitelisted token addresses
   */
  async verifyNFTHolder(address: string, hashlist: string[]) {
    // TODO v2: potentially replace with getTokenAccountsByOwner?
    const parsedAccounts = await this.connection.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID,
      {
        filters: [
          { dataSize: 165 },
          { memcmp: { offset: 32, bytes: address } },
          // Filter for NFTs: Base58 for [1,0,0,0,0,0,0,0]
          { memcmp: { bytes: 'Ahg1opVcGX', offset: 64 } },
        ],
      },
    );

    const nftHoldings = parsedAccounts.reduce<string[]>(
      (acc, parsedAccount) => {
        const mint = (parsedAccount.account.data as ParsedAccountData).parsed
          .info.mint;
        if (hashlist.includes(mint)) return [...acc, mint];
        else return acc;
      },
      [],
    );

    const isHolder = nftHoldings.length > 0;
    return isHolder;
  }
}
