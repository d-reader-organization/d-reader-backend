import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import { WhiteListType } from '@prisma/client';
interface Options {
  candyMachineAddress: string;
  label: string;
  displayLabel: string;
  supply: number;
  mintPrice: number;
  whiteListType?: WhiteListType;
  startDate?: Date;
  endDate?: Date;
  mintLimit?: number;
  frozen?: boolean;
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
      const { candyMachineAddress } = options;
      await this.candyMachineService.addCandyMachineGroup(candyMachineAddress, {
        ...options,
        splTokenAddress: WRAPPED_SOL_MINT.toBase58(),
      });
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
