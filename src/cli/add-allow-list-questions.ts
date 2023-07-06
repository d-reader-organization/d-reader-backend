import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'add-allow-list' })
export class AddAllowListQuestions {
  @Question({
    type: 'input',
    name: 'candyMachineAddress',
    message: 'address of candymachine to update',
    validate: async function (value: string) {
      if (value && !PublicKey.isOnCurve(value)) {
        return 'Address must be a solana address';
      }
      return true;
    },
  })
  parseCandyMachineAddress(candy_machine: string): string {
    return candy_machine;
  }

  @Question({
    type: 'input',
    name: 'wallets',
    message: 'list of wallet address representing the allowlist',
    validate: async function (wallets: string[]) {
      wallets.forEach((wallet) => {
        if (wallet && !PublicKey.isOnCurve(wallet)) {
          return 'Address must be a solana address';
        }
      });
      return true;
    },
  })
  parseWalletAddress(wallets: string): string[] {
    return JSON.parse(wallets);
  }

  @Question({
    type: 'input',
    name: 'label',
    default: '',
    message: 'group label (empty if allowlist is for global guards)',
  })
  parseLabel(label: string): string {
    return label;
  }
}
