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
import { metaplex, umi } from '../utils/metaplex';
import { LegacyGuardGroup } from '../types/shared';
import { PrismaService } from 'nestjs-prisma';
import { TokenStandard } from '@prisma/client';
import {
  EndDate as CoreEndDate,
  StartDate as CoreStartDate,
  DefaultGuardSet,
  GuardGroup as CoreGuardGroup,
  fetchCandyGuard,
} from '@metaplex-foundation/mpl-core-candy-machine';
import {
  Option,
  Umi,
  none,
  publicKey,
  some,
  dateTime as umiDateTime,
} from '@metaplex-foundation/umi';

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
  private readonly umi: Umi;

  constructor(
    private readonly inquirerService: InquirerService,
    private readonly candyMachineService: CandyMachineService,
    private readonly prisma: PrismaService,
  ) {
    super();
    this.metaplex = metaplex;
    this.umi = umi;
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('update-date', options);
    await this.updateDate(options);
  }

  async updateDateForLegacyCandyMachine(options: Options) {
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
    } catch (e) {
      console.error('Failed to update candymachine', e);
    }
  }

  async updateCoreCandyMachineDate(
    options: Options,
    candyGuardAddress: string,
  ) {
    const { candyMachineAddress, label, startDate, endDate } = options;
    let startDateGuard: Option<CoreStartDate> = none();
    if (startDate) startDateGuard = some({ date: umiDateTime(startDate) });

    let endDateGuard: Option<CoreEndDate> = none();
    if (endDate) endDateGuard = some({ date: umiDateTime(endDate) });

    const candyGuard = await fetchCandyGuard(
      this.umi,
      publicKey(candyGuardAddress),
    );

    const existingGroup = candyGuard.groups.find(
      (group) => group.label === label,
    );
    if (!existingGroup) {
      throw new Error(`Groups with label ${label} doesn't exists`);
    }

    const updatedGroup: CoreGuardGroup<DefaultGuardSet> = {
      label,
      guards: {
        ...existingGroup.guards,
        startDate: startDateGuard,
        endDate: endDateGuard,
      },
    };

    const filteredGroups = candyGuard.groups.filter(
      (group) => group.label != label,
    );

    const resolvedGroups = [...filteredGroups, updatedGroup];
    await this.candyMachineService.updateCoreCandyMachine(
      publicKey(candyMachineAddress),
      resolvedGroups,
      candyGuard.guards,
    );
  }

  updateDate = async (options: Options) => {
    log('\n🏗️ update date guard of a group');
    try {
      const { candyMachineAddress, label, startDate, endDate } = options;
      const candyMachine = await this.prisma.candyMachine.findUnique({
        where: { address: candyMachineAddress },
      });

      if (candyMachine.standard === TokenStandard.Core) {
        await this.updateCoreCandyMachineDate(
          options,
          candyMachine.mintAuthorityAddress,
        );
      } else {
        await this.updateDateForLegacyCandyMachine(options);
      }
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
