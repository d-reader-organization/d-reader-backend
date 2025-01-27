import { publicKey, PublicKey as UmiPublicKey } from '@metaplex-foundation/umi';
import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';
import { getTreasuryUmiPublicKey } from '../../utils/metaplex';

@QuestionSet({ name: 'create-add-delegate-transaction' })
export class CreateAddDelegateTransactionQuestions {
  @Question({
    type: 'input',
    name: 'collectionAddress',
    default: '',
    message: 'Address of the collection to add update delegate',
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
    default: getTreasuryUmiPublicKey(),
    message:
      'add a new update delegate to collection ? (press enter to add treasury as delegate)',
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
