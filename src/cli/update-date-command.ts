import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
import {
  EndDateGuardSettings,
  Metaplex,
  PublicKey,
  StartDateGuardSettings,
  toDateTime,
} from '@metaplex-foundation/js';
import { metaplex } from '../utils/metaplex';
import { LegacyGuardGroup } from '../types/shared';
import { PrismaService } from 'nestjs-prisma';

interface Options {
  candyMachineAddress: string;
  label: string;
  startDate?: Date;
  endDate?: Date;
}

@Command({
  name: 'update-date',
  description: 'update date guard of a group',
})
export class UpdateDateCommand extends CommandRunner {
  private readonly metaplex: Metaplex;

  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.metaplex = metaplex;
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('update-date', options);
    await this.updateDate(options);
  }

  updateDate = async (options: Options) => {
    log('\n🏗️ update date guard of a group');
    try {
      const { candyMachineAddress, label, startDate, endDate } = options;
      let startDateGuard: StartDateGuardSettings;
      if (startDate) startDateGuard = { date: toDateTime(startDate) };

      let endDateGuard: EndDateGuardSettings;
      if (endDate) endDateGuard = { date: toDateTime(endDate) };

      const candyMachine = await this.metaplex
        .candyMachines()
        .findByAddress({ address: new PublicKey(candyMachineAddress) });
      const existingGroup = candyMachine.candyGuard.groups.find(
        (group) => group.label === label,
      );

      const group: LegacyGuardGroup = {
        label,
        guards: {
          ...existingGroup.guards,
          startDate: startDateGuard,
          endDate: endDateGuard,
        },
      };
      const resolvedGroups = candyMachine.candyGuard.groups.filter(
        (group) => group.label != label,
      );

      const groups = [...resolvedGroups, group];
      await this.candyMachineService.updateCandyMachine(
        new PublicKey(candyMachineAddress),
        groups,
      );
      await this.prisma.candyMachineGroup.update({
        where: { label_candyMachineAddress: { label, candyMachineAddress } },
        data: { startDate, endDate },
      });
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
