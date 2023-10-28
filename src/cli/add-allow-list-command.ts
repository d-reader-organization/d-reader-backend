import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { CandyMachineService } from '../candy-machine/candy-machine.service';

interface Options {
  candyMachineAddress: string;
  label: string;
  allowList: string[];
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
      const { candyMachineAddress, label, allowList } = options;
      await this.candyMachineService.addAllowList(
        candyMachineAddress,
        allowList,
        label,
      );
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
