import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import {
  AllowListGuardSettings,
  DefaultCandyGuardSettings,
  PublicKey,
  getMerkleRoot,
} from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { GuardGroup } from '../types/shared';

interface Options {
  candyMachineAddress: string;
  wallets: string[];
  label?: string;
}

@Command({
  name: 'add-allow-list',
  description: 'add or update allowlist guard',
})
export class AddAllowList extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
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
      const { candyMachineAddress, wallets, label } = options;
      const candyMachinePublicKey = new PublicKey(candyMachineAddress);
      const candyMachine = await metaplex
        .candyMachines()
        .findByAddress({ address: candyMachinePublicKey });
      const allowList: AllowListGuardSettings =
        wallets.length > 0
          ? {
              merkleRoot: getMerkleRoot(wallets),
            }
          : null;

      let groups: GuardGroup[], guard: Partial<DefaultCandyGuardSettings>;

      if (label != '') {
        const existingGroup = candyMachine.candyGuard.groups.find(
          (group) => group.label === label,
        );
        const group = {
          label,
          guards: { ...existingGroup?.guards, allowList },
        };
        const resolvedGroups = candyMachine.candyGuard.groups.filter(
          (group) => group.label != label,
        );
        groups = [...resolvedGroups, group];
      } else {
        guard = { ...candyMachine.candyGuard.guards, allowList };
      }

      await this.candyMachineService.updateCandyMachine(
        candyMachinePublicKey,
        groups,
        guard,
      );
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
