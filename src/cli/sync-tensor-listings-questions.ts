import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'sync-tensor-listings' })
export class SyncTensorListingsQuestions {
  @Question({
    type: 'input',
    name: 'collectionAddress',
    message: 'Address of collection to sync',
    validate: async function (collectionAddress: string) {
      if (collectionAddress && !PublicKey.isOnCurve(collectionAddress)) {
        return 'Address must be a solana address';
      }
      return !!collectionAddress;
    },
  })
  parseCollectionAddresses(address: string): string {
    return address;
  }
}
