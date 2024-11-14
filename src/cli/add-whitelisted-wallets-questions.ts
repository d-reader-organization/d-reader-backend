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
    name: 'collection',
    message: 'Address of collection whose holders will be added in whitelist',
    default: [],
    validate: async function (collection: string) {
      if (!collection) return false;
      return true;
    },
  })
  parseCollectionAddress(collection: string): string {
    return collection;
  }
}
