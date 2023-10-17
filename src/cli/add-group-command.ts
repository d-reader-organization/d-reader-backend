import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import {
  EndDateGuardSettings,
  FreezeSolPaymentGuardSettings,
  MintLimitGuardSettings,
  PublicKey,
  RedeemedAmountGuardSettings,
  StartDateGuardSettings,
  WRAPPED_SOL_MINT,
  toBigNumber,
  toDateTime,
} from '@metaplex-foundation/js';
import { initMetaplex } from '../utils/metaplex';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { GuardGroup } from '../types/shared';
import { solFromLamports } from '../utils/helpers';
import { GuardParams } from 'src/candy-machine/dto/types';

interface Options {
  candyMachineAddress: string;
  label: string;
  displayLabel: string;
  supply: number;
  startDate?: Date;
  endDate?: Date;
  mintLimit?: number;
  mintPrice: number;
}

// TODO v2: move this to an API endpoint
// make sure the newly added group does not override an existing one
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
        displayLabel,
        supply,
      } = options;
      const candyMachinePublicKey = new PublicKey(candyMachineAddress);
      const metaplex = initMetaplex();

      const candyMachine = await metaplex
        .candyMachines()
        .findByAddress({ address: candyMachinePublicKey });
      const candyMachineGroups = candyMachine.candyGuard.groups;

      const redeemedAmountGuard: RedeemedAmountGuardSettings = {
        maximum: toBigNumber(supply),
      };
      let startDateGuard: StartDateGuardSettings;
      if (startDate) startDateGuard = { date: toDateTime(startDate) };

      let endDateGuard: EndDateGuardSettings;
      if (endDate) endDateGuard = { date: toDateTime(endDate) };

      const freezeSolPayment: FreezeSolPaymentGuardSettings = {
        amount: solFromLamports(mintPrice),
        destination: metaplex.identity().publicKey,
      };
      let mintLimitGuard: MintLimitGuardSettings;
      if (mintLimit)
        mintLimitGuard = { id: candyMachineGroups.length, limit: mintLimit };

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
          redeemedAmount: redeemedAmountGuard,
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
      const guardParams: GuardParams = {
        startDate,
        endDate,
        displayLabel,
        label,
        mintPrice,
        splTokenAddress: WRAPPED_SOL_MINT.toBase58(),
        mintLimit,
        supply,
      };
      await this.candyMachineService.addCandyMachineGroup(
        candyMachineAddress,
        guardParams,
      );
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
