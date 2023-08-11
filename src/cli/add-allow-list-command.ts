import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import {
  AllowListGuardSettings,
  PublicKey,
  getMerkleRoot,
} from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { GuardGroup } from '../types/shared';
import { PrismaService } from 'nestjs-prisma';

interface Options {
  candyMachineAddress: string;
  label: string;
}

@Command({
  name: 'add-allow-list',
  description: 'add or update allowlist guard',
})
export class AddAllowList extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('add-allow-list', options);
    await this.addAllowList(options);
  }

  addAllowList = async (options: Options) => {
    log('\n🏗️  updating candymachine with allowlist');
    try {
      const { candyMachineAddress, label } = options;
      const candyMachinePublicKey = new PublicKey(candyMachineAddress);
      const candyMachine = await metaplex
        .candyMachines()
        .findByAddress({ address: candyMachinePublicKey });

      const wallets = await this.prisma.allowList
        .findFirst({
          where: { groupLabel: label, candyMachineAddress },
          include: { wallets: true },
        })
        .then((values) => values.wallets.map((wallet) => wallet.walletAddress));

      const allowList: AllowListGuardSettings =
        wallets.length > 0
          ? {
              merkleRoot: getMerkleRoot(wallets),
            }
          : null;

      const existingGroup = candyMachine.candyGuard.groups.find(
        (group) => group.label === label,
      );
      const group: GuardGroup = {
        label,
        guards: { ...existingGroup?.guards, allowList },
      };
      const resolvedGroups = candyMachine.candyGuard.groups.filter(
        (group) => group.label != label,
      );
      const groups = [...resolvedGroups, group];

      await this.candyMachineService.updateCandyMachine(
        candyMachinePublicKey,
        groups,
      );
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
