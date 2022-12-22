import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { Command, CommandRunner, Option } from 'nest-commander';
import { Metaplex, sol } from '@metaplex-foundation/js';
import { isSolanaAddress } from '../decorators/IsSolanaAddress';
import { Cluster as ClusterEnum } from '../types/cluster';

interface AirdropSolCommandOptions {
  address: string;
}

@Command({
  name: 'airdrop-sol',
  description: 'Airdrop solana tokens to a specific wallet',
})
export class AirdropSolCommand extends CommandRunner {
  private readonly metaplex: Metaplex;

  constructor() {
    super();

    const endpoint = clusterApiUrl(ClusterEnum.Devnet);
    const connection = new Connection(endpoint, 'confirmed');
    this.metaplex = new Metaplex(connection);
  }

  async run(
    passedParam: string[],
    options: AirdropSolCommandOptions,
  ): Promise<void> {
    this.airdropSol(options.address);
  }

  @Option({
    flags: '-a, --address [string]',
    description: 'Recipient wallet address',
  })
  parseAddress(address: string): string {
    if (!isSolanaAddress(address)) {
      throw new Error('Faulty --address argument, address is not on curve');
    }

    return address;
  }

  async airdropSol(address: string) {
    const publicKey = new PublicKey(address);

    try {
      await this.metaplex.rpc().airdrop(publicKey, sol(2));
      console.log(`2 Sol added successfully to ${address}!`);
    } catch (e) {
      console.log(`Failed to drop 2 Sol in the wallet ${address}\n${e}`);
    }
  }
}
