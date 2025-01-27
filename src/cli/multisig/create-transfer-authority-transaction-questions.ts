import { publicKey, PublicKey as UmiPublicKey } from '@metaplex-foundation/umi';
import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';
import { getTreasuryUmiPublicKey } from '../../utils/metaplex';

@QuestionSet({ name: 'create-transfer-authority-transaction' })
export class CreateTransferAuthorityTransactionQuestions {
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
    name: 'newUpdateAuthority',
    default: getTreasuryUmiPublicKey(),
    message:
      'transfer update authority for the collection ? (press enter to transfer update authority to treasury)',
    validate: async function (value: string) {
      if (value && !PublicKey.isOnCurve(value)) {
        return 'Address must be a solana address';
      }
      return true;
    },
  })
  parseUpdateAuthorityAddress(address: string): UmiPublicKey {
    return publicKey(address);
  }
}
