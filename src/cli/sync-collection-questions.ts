import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'sync-collection' })
export class SyncCollectionQuestions {
  @Question({
    type: 'input',
    name: 'nfts',
    message: 'Addresses of the nfts of collection to sync',
    default: [],
    validate: async function (nfts: string[]) {
      nfts.forEach((nft) => {
        if (nft && !PublicKey.isOnCurve(nft)) {
          return 'Address must be a solana address';
        }
      });
      return true;
    },
  })
  parseCollectionAddresses(address: string): string[] {
    return JSON.parse(address);
  }
}
