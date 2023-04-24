import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'wallet' })
export class SyncWalletQuestions {
  @Question({
    type: 'input',
    name: 'wallet',
    default: '',
    message: 'Address of the wallet to sync',
    validate: async function (value: string) {
      if (!value || !PublicKey.isOnCurve(value)) {
        return 'wallet must be a solana address';
      }
      return true;
    },
  })
  parseWalletAddress(wallet: string): string {
    return wallet;
  }
}
