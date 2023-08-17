import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import {
  DateTime,
  EndDateGuardSettings,
  FreezeSolPaymentGuardSettings,
  MintLimitGuardSettings,
  PublicKey,
  StartDateGuardSettings,
} from '@metaplex-foundation/js';
import { initMetaplex } from '../utils/metaplex';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { GuardGroup } from '../types/shared';
import { solFromLamports } from '../utils/helpers';

interface Options {
  candyMachineAddress: string;
  label: string;
  startDate: DateTime;
  endDate: DateTime;
  mintLimit: number;
  mintPrice: number;
}

@Command({
  name: 'add-group',
  description: 'add group in a candymachine',
})
export class AddGroupCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('add-group', options);
    await this.addGroup(options);
  }

  addGroup = async (options: Options) => {
    log('\n🏗️  add new group in candymachine');
    try {
      const {
        candyMachineAddress,
        label,
        startDate,
        endDate,
        mintLimit,
        mintPrice,
      } = options;
      const candyMachinePublicKey = new PublicKey(candyMachineAddress);
      const metaplex = initMetaplex();

      const candyMachine = await metaplex
        .candyMachines()
        .findByAddress({ address: candyMachinePublicKey });
      const candyMachineGroups = candyMachine.candyGuard.groups;

      const startDateGuard: StartDateGuardSettings = {
        date: startDate,
      };
      const endDateGuard: EndDateGuardSettings = {
        date: endDate,
      };
      const freezeSolPayment: FreezeSolPaymentGuardSettings = {
        amount: solFromLamports(mintPrice),
        destination: metaplex.identity().publicKey,
      };
      const mintLimitGuard: MintLimitGuardSettings = {
        id: candyMachineGroups.length,
        limit: mintLimit,
      };

      const existingGroup = candyMachineGroups.find(
        (group) => group.label === label,
      );
      if (existingGroup) {
        throw new Error(`A group with label ${label} already exists`);
      }
      const group: GuardGroup = {
        label,
        guards: {
          ...candyMachine.candyGuard.guards,
          freezeSolPayment,
          startDate: startDateGuard,
          endDate: endDateGuard,
          mintLimit: mintLimitGuard,
        },
      };
      const resolvedGroups = candyMachineGroups.filter(
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
