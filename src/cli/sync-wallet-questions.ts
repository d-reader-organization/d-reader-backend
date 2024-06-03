import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'sync-wallet' })
export class SyncWalletQuestions {
  @Question({
    type: 'input',
    name: 'address',
    default: '',
    message: 'Address of the wallet to sync (empty to sync all wallets)',
    validate: async function (value: string) {
      if (value && !PublicKey.isOnCurve(value)) {
        return 'Address must be a solana address';
      }
      return true;
    },
  })
  parseWalletAddress(address: string): string {
    return address;
  }
}
