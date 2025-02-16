import { LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { chance, getRandomInt, maybeDateNow } from '../src/utils/helpers';
import { PrismaClient } from '@prisma/client';
import { HeliusService } from '../src/webhooks/helius/helius.service';
import { PrismaService } from 'nestjs-prisma';
import { WebSocketGateway } from '../src/websockets/websocket.gateway';
import { s3Service } from '../src/aws/s3.service';
import { BundlrStorageDriver, sol } from '@metaplex-foundation/js';
import { initMetaplex } from '../src/utils/metaplex';
import { digitalAssetGenresToSeed, genresToSeed } from './genres';
import { carouselSlidesToSeed } from './carousel-slides';
import { usersToSeed, generateDummyUsersData } from './users';
import {
  gonneytoons,
  longwood,
  madMuse,
  saucerpen,
  studioNx,
  swamplabs,
  tsukiverse,
} from './creators';
import {
  animoData,
  babiesData,
  birthData,
  countyData,
  gooneyData,
  gorecatsData,
  heistData,
  islandData,
  janaData,
  lupersData,
  narentsData,
  nikoData,
  portalData,
  taintData,
  tsukiData,
  versusData,
  watersData,
  wretchesData,
} from './comics';
import {
  animoEp1Data,
  babiesEp1Data,
  birthEp1Data,
  countyEp1Data,
  countyEp2Data,
  gooneyEp1Data,
  gooneyEp2Data,
  gooneyEp3Data,
  gooneyEp4Data,
  gorecatsEp1Data,
  heistEp1Data,
  islandEp1Data,
  janaEp1Data,
  janaEp2Data,
  lupersEp1Data,
  narentinesEp1Data,
  nikoEp1Data,
  portalEp1Data,
  taintEp1Data,
  tsukiEp1Data,
  versusEp1Data,
  watersEp1Data,
  wretchesEp1Data,
  wretchesEp2Data,
  wretchesEp3Data,
  wretchesEp4Data,
  wretchesEp5Data,
  wretchesEp6Data,
} from './comic-issues';
import { splTokensToSeed } from './spl-tokens';
import { NonceService } from '../src/nonce/nonce.service';

const s3 = new s3Service();
const prisma = new PrismaClient();
const prismaService = new PrismaService();
const webSocketGateway = new WebSocketGateway();
const nonceService = new NonceService(prismaService);
const heliusService = new HeliusService(
  prismaService,
  webSocketGateway,
  nonceService,
);
const seedBucket = process.env.AWS_SEED_BUCKET_NAME;
const metaplex = initMetaplex(heliusService.helius.endpoint);
const treasuryPubKey = metaplex.identity().publicKey;
const isDevnet = process.env.SOLANA_CLUSTER === 'devnet';

const solanaMetaplex = initMetaplex(clusterApiUrl('devnet'));
const storage = metaplex.storage().driver() as BundlrStorageDriver;

const copyFromSeedBucket = async () => {
  const keysToDelete = await s3.listFolderKeys({ Prefix: '' });
  const filesToSeed = await s3.listFolderKeys({
    Bucket: seedBucket,
    Prefix: '',
  });

  await s3.deleteObjects(keysToDelete);
  console.info(`✅ Emptied '${s3.bucket}' s3 bucket! Cloning from seed...`);

  const copyFiles = filesToSeed.map((key) => {
    return s3.copyObject({ CopySource: `/${seedBucket}/${key}`, Key: key });
  });

  await Promise.all(copyFiles);
  console.info(`✅ Copied files from the seed bucket`);
};

const tryAirdropping = async () => {
  try {
    await solanaMetaplex.rpc().airdrop(treasuryPubKey, sol(2));
    console.info('Airdropped 2 sol');
  } catch {
    console.info('Failed to airdrop 2 sol to the treasury wallet');
  }
};

const refillBundlr = async () => {
  try {
    const bundlr = await storage.bundlr();
    const balance = await bundlr.getBalance(treasuryPubKey.toBase58());
    const solBalance = balance.toNumber() / LAMPORTS_PER_SOL;
    console.info('Bundlr balance: ', solBalance);

    if (solBalance < 0.3) {
      bundlr.fund(0.2 * LAMPORTS_PER_SOL);
      console.info('Funded bundlr storage');
    }
  } catch (e) {
    console.info('Failed to fund bundlr storage');
  }
};

async function main() {
  if (!isDevnet) {
    throw new Error(`Are you seeding on mainnet 😨 ? I can't allow that.`);
  }
  if (!process.env.WEBHOOK_ID) {
    throw new Error('process.env.WEBHOOK_ID undefined');
  }

  console.info('Emptying the database...');
  await prisma.statefulCover.deleteMany();
  await prisma.statelessCover.deleteMany();
  await prisma.comicCollaborator.deleteMany();
  await prisma.comicIssueCollaborator.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.candyMachineReceipt.deleteMany();
  await prisma.candyMachineCouponWhitelistedWallet.deleteMany();
  await prisma.candyMachineCouponCurrencySetting.deleteMany();
  await prisma.candyMachineCoupon.deleteMany();
  await prisma.collectibleComic.deleteMany();
  await prisma.royaltyWallet.deleteMany();
  await prisma.candyMachine.deleteMany();
  await prisma.collectibleComicMetadata.deleteMany();
  await prisma.collectibleComicCollection.deleteMany();
  await prisma.digitalAsset.deleteMany();
  await prisma.comicPage.deleteMany();
  await prisma.comicIssue.deleteMany();
  await prisma.userComic.deleteMany();
  await prisma.userComicIssue.deleteMany();
  await prisma.userCreator.deleteMany();
  await prisma.comic.deleteMany();
  await prisma.creatorChannel.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.carouselSlide.deleteMany();
  await prisma.user.deleteMany();
  await prisma.splToken.deleteMany();
  console.info('Emptied database!');

  // CLEAR S3 BUCKET AND RESEED FROM THE SEED BUCKET
  if (process.env.SEED_S3 === 'true') await copyFromSeedBucket();

  // SEED CAROUSEL SLIDES
  await prisma.carouselSlide.createMany({ data: carouselSlidesToSeed });
  console.info('Added carousel slides');

  // SEED GENRES
  await prisma.genre.createMany({ data: genresToSeed });
  console.info('Added genres');

  // SEED DIGITAL ASSET GENRES
  await prisma.digitalAssetGenre.createMany({ data: digitalAssetGenresToSeed });
  console.info('Added digital asset genres');

  // SEED USERS
  await prisma.user.createMany({ data: await usersToSeed() });
  console.info('Added users');

  // SEED USERS WITH CREATOR CHANNELS
  const nxC = await prisma.user.create({ data: await studioNx() });
  const swC = await prisma.user.create({ data: await swamplabs() });
  const goC = await prisma.user.create({ data: await gonneytoons() });
  const saC = await prisma.user.create({ data: await saucerpen() });
  const mmC = await prisma.user.create({ data: await madMuse() });
  const tsC = await prisma.user.create({ data: await tsukiverse() });
  const llC = await prisma.user.create({ data: await longwood() });
  console.info('Added creators');

  // SEED COMICS
  const gorecatsC = await prisma.comic.create({ data: gorecatsData(nxC.id) });
  const babiesC = await prisma.comic.create({ data: babiesData(nxC.id) });
  const nikoC = await prisma.comic.create({ data: nikoData(nxC.id) });
  const lupersC = await prisma.comic.create({ data: lupersData(swC.id) });
  const narentinesC = await prisma.comic.create({ data: narentsData(swC.id) });
  const gooneyC = await prisma.comic.create({ data: gooneyData(goC.id) });
  const animoC = await prisma.comic.create({ data: animoData(saC.id) });
  const birthC = await prisma.comic.create({ data: birthData(saC.id) });
  const taintC = await prisma.comic.create({ data: taintData(saC.id) });
  const islandC = await prisma.comic.create({ data: islandData(saC.id) });
  const wretchesC = await prisma.comic.create({ data: wretchesData(mmC.id) });
  const countyC = await prisma.comic.create({ data: countyData(mmC.id) });
  const janaC = await prisma.comic.create({ data: janaData(mmC.id) });
  const watersC = await prisma.comic.create({ data: watersData(mmC.id) });
  const versusC = await prisma.comic.create({ data: versusData(mmC.id) });
  const tsukiC = await prisma.comic.create({ data: tsukiData(tsC.id) });
  const heistC = await prisma.comic.create({ data: heistData(llC.id) });
  console.info('Added comics');

  // SEED COMIC ISSUES
  await prisma.comicIssue.create({ data: gorecatsEp1Data(gorecatsC.slug) });
  await prisma.comicIssue.create({ data: babiesEp1Data(babiesC.slug) });
  await prisma.comicIssue.create({ data: nikoEp1Data(nikoC.slug) });
  await prisma.comicIssue.create({ data: narentinesEp1Data(narentinesC.slug) });
  await prisma.comicIssue.create({ data: lupersEp1Data(lupersC.slug) });
  await prisma.comicIssue.create({ data: gooneyEp1Data(gooneyC.slug) });
  await prisma.comicIssue.create({ data: gooneyEp2Data(gooneyC.slug) });
  await prisma.comicIssue.create({ data: gooneyEp3Data(gooneyC.slug) });
  await prisma.comicIssue.create({ data: gooneyEp4Data(gooneyC.slug) });
  await prisma.comicIssue.create({ data: animoEp1Data(animoC.slug) });
  await prisma.comicIssue.create({ data: taintEp1Data(taintC.slug) });
  await prisma.comicIssue.create({ data: islandEp1Data(islandC.slug) });
  await prisma.comicIssue.create({ data: wretchesEp1Data(wretchesC.slug) });
  await prisma.comicIssue.create({ data: janaEp1Data(janaC.slug) });
  await prisma.comicIssue.create({ data: countyEp1Data(countyC.slug) });
  await prisma.comicIssue.create({ data: watersEp1Data(watersC.slug) });
  await prisma.comicIssue.create({ data: versusEp1Data(versusC.slug) });
  await prisma.comicIssue.create({ data: tsukiEp1Data(tsukiC.slug) });
  await prisma.comicIssue.create({ data: heistEp1Data(heistC.slug) });
  console.info('Added comic issues');

  const comics = await prisma.comic.findMany();
  const comicSlugs = comics.map((c) => c.slug);
  const comicIssues = await prisma.comicIssue.findMany();
  const comicIssueIds = comicIssues.map((ci) => ci.id);

  // SEED DUMMY USER REACTIONS
  const dummyUsersCount = 8;
  const dummyUsersData = generateDummyUsersData(dummyUsersCount);
  for (const dummyUserData of dummyUsersData) {
    const user = await prisma.user.create({ data: dummyUserData });

    for (const comicSlug of comicSlugs) {
      const shouldRate = chance(50);
      await prisma.userComic.create({
        data: {
          userId: user.id,
          comicSlug,
          favouritedAt: maybeDateNow(60),
          subscribedAt: maybeDateNow(30),
          viewedAt: maybeDateNow(60),
          bookmarkedAt: maybeDateNow(20),
          rating: shouldRate ? getRandomInt(4, 5) : undefined,
        },
      });
    }

    for (const comicIssueId of comicIssueIds) {
      const shouldRate = chance(50);
      await prisma.userComicIssue.create({
        data: {
          userId: user.id,
          comicIssueId,
          favouritedAt: maybeDateNow(60),
          subscribedAt: maybeDateNow(10),
          viewedAt: maybeDateNow(60),
          readAt: maybeDateNow(60),
          rating: shouldRate ? getRandomInt(4, 5) : undefined,
        },
      });
    }
    console.info('Added dummy user: ' + dummyUserData.username);
  }

  // SEED SUPPORTED SPL TOKENS
  await prisma.splToken.createMany({ data: splTokensToSeed });

  // SEED MORE DATA ON DEVNET
  if (isDevnet) {
    await tryAirdropping();

    const portalC = await prisma.comic.create({ data: portalData(nxC.id) });

    await prisma.comicIssue.create({ data: portalEp1Data(portalC.slug) });
    await prisma.comicIssue.create({ data: birthEp1Data(birthC.slug) });
    await prisma.comicIssue.create({ data: wretchesEp2Data(wretchesC.slug) });
    await prisma.comicIssue.create({ data: wretchesEp3Data(wretchesC.slug) });
    await prisma.comicIssue.create({ data: wretchesEp4Data(wretchesC.slug) });
    await prisma.comicIssue.create({ data: wretchesEp5Data(wretchesC.slug) });
    await prisma.comicIssue.create({ data: wretchesEp6Data(wretchesC.slug) });
    await prisma.comicIssue.create({ data: janaEp2Data(janaC.slug) });
    await prisma.comicIssue.create({ data: countyEp2Data(countyC.slug) });
  }

  await refillBundlr();
  console.info(
    "⚠️ Please make sure to run 'yarn sync-webhook' command in order to set Helius webhooks correctly",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
