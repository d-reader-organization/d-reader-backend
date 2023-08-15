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
    name: 'label',
    message: 'group label must be of max 6 characters',
    validate: async function (value: string) {
      if (!value || value.length > 6 || value.length < 1)
        return 'invalid group label';
      return true;
    },
  })
  parseLabel(label: string): string {
    return label;
  }

  @Question({
    type: 'input',
    name: 'allowList',
    message:
      'list of wallet address to add in the allowlist (empty if no wallet to add)',
    default: [],
    validate: async function (allowList: string[]) {
      allowList.forEach((wallet) => {
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
    name: 'whitelistSupply',
    message: 'supply of wallets to give whitelist (empty to not update)',
  })
  parseWhitelistSupply(supply: number): number {
    if (typeof supply === 'string') return +supply;
    return supply;
  }
}
