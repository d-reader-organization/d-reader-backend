import { publicKey, PublicKey as UmiPublicKey } from '@metaplex-foundation/umi';
import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'transfer-authority-to-multisig' })
export class TransferAuthorityToMultisigQuestions {
  @Question({
    type: 'input',
    name: 'collectionAddress',
    default: '',
    message:
      'Address of the collection to transfer update authority to multisig',
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
}
