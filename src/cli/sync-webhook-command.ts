import { Cluster } from '@solana/web3.js';
import { Command, CommandRunner, InquirerService } from 'nest-commander';
import { HeliusService } from '../webhooks/helius/helius.service';
import { cb, cuy, log, logEnv, logErr } from './chalk';
import { PrismaService } from 'nestjs-prisma';
import { Helius } from 'helius-sdk';
import { CORE_AUCTIONS_PROGRAM_ID } from 'core-auctions';

interface Options {
  webhookURL: string;
}

@Command({
  name: 'sync-webhook',
  description: "Create a webhook if it's not existing or edit an existing one",
})
export class SyncWebhookCommand extends CommandRunner {
  constructor(
    private readonly inquirerService: InquirerService,
    private readonly heliusService: HeliusService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(_: string[], options: Options): Promise<void> {
    options = await this.inquirerService.ask('sync-webhook', options);
    await this.syncWebhook(options);
  }

  syncWebhook = async (options: Options) => {
    log('\n🏗️  Syncing webhook...');

    const { webhookURL } = options;
    const webhookID = process.env.WEBHOOK_ID;
    const helius = new Helius(
      process.env.HELIUS_API_KEY,
      process.env.SOLANA_CLUSTER as Cluster,
    );

    const accountAddresses = await this.collectAddresses();

    // if webhookID is not specified, create a new one
    if (!webhookID || webhookID === 'REPLACE_THIS') {
      await this.createNewWebhook(webhookID, accountAddresses);
    }

    try {
      const webhook = await helius.getWebhookByID(webhookID);
      const updatedWebhook = await this.heliusService.updateWebhook(webhookID, {
        accountAddresses,
        // override the webhookURL if it was provided
        webhookURL: options.webhookURL || webhook.webhookURL,
      });
      log(`✅ Found webhook with ID: ${cuy(webhookID)}`);
      log(`⛓️  WebhookURL is: ${cb(updatedWebhook.webhookURL)}`);
    } catch (e) {
      logErr(`Couldn't find the webhook with ID: ${webhookURL}`);
      await this.createNewWebhook(webhookURL, accountAddresses);
    }
    log('\n');
  };

  async createNewWebhook(webhookURL: string, accountAddresses: string[]) {
    log('🏗️  Creating new webhook');
    if (!webhookURL) {
      logErr(`Cannot create a webhook without URL specified: ${webhookURL}`);
      return;
    }
    const createdWebhook = await this.heliusService.createWebhook({
      accountAddresses,
      webhookURL,
    });
    log(`✅ Created webhook with ID: ${cuy(createdWebhook.webhookID)}`);
    log(`⛓️  WebhookURL is: ${cb(createdWebhook.webhookURL)}`);
    log('\n⚠️  Replace .env placeholder values with these below');
    log('----------------------------------------------------');
    logEnv('WEBHOOK_ID', createdWebhook.webhookID);
  }

  /** Collect all candy machine, NFT, and AuctionHouse addresses to listen to */
  async collectAddresses() {
    const foundNfts = await this.prisma.digitalAsset.findMany({
      where: { isBurned: false },
      select: { address: true },
    });

    // find all CMs that are active
    const foundCandyMachines = await this.prisma.candyMachine.findMany({
      where: { itemsRemaining: { gt: 0 } },
      select: { address: true },
    });

    const nftAddresses = foundNfts.map((nft) => nft.address);
    const candyMachineAddresses = foundCandyMachines.map((cm) => cm.address);

    return nftAddresses.concat(
      candyMachineAddresses,
      CORE_AUCTIONS_PROGRAM_ID.toString(),
    );
  }
}
