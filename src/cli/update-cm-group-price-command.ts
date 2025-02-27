import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { PrismaService } from 'nestjs-prisma';
import {
  DefaultGuardSet,
  fetchCandyGuard,
  fetchCandyMachine,
  GuardGroup,
  SolPayment,
  ThirdPartySigner,
  TokenPayment,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { lamports, publicKey, Umi } from '@metaplex-foundation/umi';
import { getThirdPartySigner, umi } from '../utils/metaplex';
import { FUNDS_DESTINATION_ADDRESS, SOL_ADDRESS } from '../constants';
import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox';
import { some } from '@metaplex-foundation/umi';
import { CandyMachineService } from '../candy-machine/candy-machine.service';
interface Options {
  candyMachineAddress: string;
  label: string;
  price: number;
  splTokenAddress: string;
}

@Command({
  name: 'update-cm-group-price',
  description: 'update price of a candymachine group',
})
export class UpdateCMGroupPriceCommand extends CommandRunner {
  private readonly umi: Umi;
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly prisma: PrismaService,
    private readonly candyMachineService: CandyMachineService,
  ) {
    super();
    this.umi = umi;
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('update-cm-group-price', options);
    await this.updatePrice(options);
  }

  updatePrice = async (options: Options) => {
    log('\n🏗️ update date guard of a coupon');
    try {
      const { label, price, candyMachineAddress, splTokenAddress } = options;

      const candyMachine = await fetchCandyMachine(
        this.umi,
        publicKey(candyMachineAddress),
      );

      const candyGuard = await fetchCandyGuard(
        this.umi,
        candyMachine.mintAuthority,
      );

      const candyMachineGroups = candyGuard.groups;

      let paymentGuardName: string;

      const isSolPayment = splTokenAddress === SOL_ADDRESS;
      let paymentGuard: TokenPayment | SolPayment;

      if (isSolPayment) {
        paymentGuardName = 'solPayment';
        paymentGuard = {
          lamports: lamports(price),
          destination: publicKey(FUNDS_DESTINATION_ADDRESS),
        };
      } else {
        paymentGuardName = 'tokenPayment';
        paymentGuard = {
          amount: BigInt(price),
          destinationAta: findAssociatedTokenPda(this.umi, {
            mint: publicKey(splTokenAddress),
            owner: publicKey(FUNDS_DESTINATION_ADDRESS),
          })[0],
          mint: publicKey(splTokenAddress),
        };
      }

      const thirdPartySigner = getThirdPartySigner();
      const thirdPartySignerGuard: ThirdPartySigner = {
        signerKey: publicKey(thirdPartySigner),
      };

      const group: GuardGroup<DefaultGuardSet> = {
        label,
        guards: {
          ...candyGuard.guards,
          [paymentGuardName]: some(paymentGuard),
          thirdPartySigner: some(thirdPartySignerGuard),
        },
      };

      const resolvedGroups = candyMachineGroups.filter(
        (group) => group.label != label,
      );
      resolvedGroups.push(group);

      await this.candyMachineService.updateCoreCandyMachine(
        publicKey(candyMachineAddress),
        resolvedGroups,
        candyGuard.guards,
      );

      await this.prisma.candyMachineCouponCurrencySetting.update({
        where: { label_candyMachineAddress: { label, candyMachineAddress } },
        data: { mintPrice: price },
      });
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
