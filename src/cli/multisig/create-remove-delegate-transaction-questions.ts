import { publicKey, PublicKey as UmiPublicKey } from '@metaplex-foundation/umi';
import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'create-remove-delegate-transaction' })
export class CreateRemoveDelegateTransactionQuestions {
  @Question({
    type: 'input',
    name: 'collectionAddress',
    default: '',
    message: 'Address of the collection',
    validate: async function (value: string) {
      if (value && !PublicKey.isOnCurve(value)) {
        return 'Address must be a solana address';
      }
      return true;
    },
  })
  parseCollectionAddress(address: string): UmiPublicKey {
    return publicKey(address);
  }

  @Question({
    type: 'input',
    name: 'delegate',
    message: 'update delegate address to remove from collection',
    validate: async function (value: string) {
      if (value && !PublicKey.isOnCurve(value)) {
        return 'Address must be a solana address';
      }
      return true;
    },
  })
  parseUpdateDelegateAddress(address: string): UmiPublicKey {
    return publicKey(address);
  }
}
