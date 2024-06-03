import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'sync-listings' })
export class SyncListingsQuestions {
  @Question({
    type: 'input',
    name: 'nftAddress',
    message: 'Address of any nft from collection to sync',
    validate: async function (nft: string) {
      if (nft && !PublicKey.isOnCurve(nft)) {
        return 'Address must be a solana address';
      }
      return !!nft;
    },
  })
  parseNftAddresses(address: string): string {
    return address;
  }
}
