import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { log, logErr } from './chalk';
import { PrismaService } from 'nestjs-prisma';
interface Options {
  couponId: number;
  startsAt?: Date;
  expiresAt?: Date;
}

@Command({
  name: 'update-date',
  description: 'update date guard of a group',
})
export class UpdateDateCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('update-date', options);
    await this.updateDate(options);
  }

  updateDate = async (options: Options) => {
    log('\n🏗️ update date guard of a coupon');
    try {
      const { couponId, startsAt, expiresAt } = options;

      await this.prisma.candyMachineCoupon.update({
        where: { id: couponId },
        data: { startsAt, expiresAt },
      });
    } catch (error) {
      logErr(`Error : ${error}`);
    }
    log('\n');
  };
}
