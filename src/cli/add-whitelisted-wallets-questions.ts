import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'add-whitelisted-wallets' })
export class AddWhitelistedWalletsQuestions {
  @Question({
    type: 'input',
    name: 'couponId',
    message: 'id of coupon to add whitelisted wallets to',
    validate: async function (value: string) {
      if (!value) {
        return 'Coupon id must be a number';
      }
      return true;
    },
  })
  parseCouponId(couponId: string): number {
    return +couponId;
  }

  @Question({
    type: 'input',
    name: 'wallets',
    message:
      'list of whitelisted wallets to add in coupon (empty if no wallet to add)',
    default: [],
    validate: async function (wallets: string[]) {
      wallets.forEach((wallet) => {
        if (wallet && !PublicKey.isOnCurve(wallet)) {
          return 'Address must be a solana address';
        }
      });
      return true;
    },
  })
  parseWalletAddress(wallets: string): string[] {
    return JSON.parse(wallets);
  }
}
