import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import { CouponType, PrismaClient, WhiteListType } from '@prisma/client';

/*
  STEPS TO MIGRATE:
  1). Run the migration script : ``candy_machine_coupon_migrations
  2). Run this script with ``npx ts-node ./prisma/migrate-groups-to-coupon.ts``
  3). Run the migration script drop_group_table_migrations
*/

const prisma = new PrismaClient();

async function migrateGroupstoCoupon() {
  // Fetch data from CandyMachineGroup
  const groups = await prisma.candyMachineGroup.findMany();

  const whiteListTypeToCouponType = {
    [WhiteListType.Public]: CouponType.PublicUser,
    [WhiteListType.User]: CouponType.RegisteredUser,
    [WhiteListType.WalletWhiteList]: CouponType.WhitelistedWallet,
    [WhiteListType.UserWhiteList]: CouponType.WhitelistedUser,
  };

  for (const group of groups) {
    // Insert data into CandyMachineCoupon
    await prisma.candyMachineCoupon.create({
      data: {
        name: 'Public',
        description: 'Public',
        supply: group.supply,
        numberOfRedemptions: group.mintLimit,
        startsAt: group.startDate,
        expiresAt: group.endDate,
        type: whiteListTypeToCouponType[group.whiteListType],
        candyMachine: {
          connect: {
            address: group.candyMachineAddress,
          },
        },
        currencySettings: {
          create: {
            candyMachineAddress: group.candyMachineAddress,
            label: group.label,
            mintPrice: group.mintPrice,
            usdcEquivalent: 0,
            splTokenAddress: group.splTokenAddress,
          },
        },
      },
    });
  }

  const receipts = await prisma.candyMachineReceipt.findMany({});
  for (const receipt of receipts) {
    let couponId: number;
    if (receipt.label == 'UNKNOWN') {
      const coupon = await prisma.candyMachineCoupon.findFirst({
        where: {
          candyMachineAddress: receipt.candyMachineAddress,
          type: CouponType.PublicUser,
          currencySettings: {
            some: {
              splTokenAddress: WRAPPED_SOL_MINT.toString(),
            },
          },
        },
      });
      couponId = coupon.id;
    } else {
      const coupon = await prisma.candyMachineCoupon.findFirst({
        where: {
          candyMachineAddress: receipt.candyMachineAddress,
          currencySettings: {
            some: {
              label: receipt.label,
            },
          },
        },
      });
      couponId = coupon.id;
    }
    console.log('Coupon ID', couponId);
    await prisma.candyMachineReceipt.update({
      where: { collectibleComicAddress: receipt.collectibleComicAddress },
      data: { couponId },
    });
  }
}

migrateGroupstoCoupon()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
