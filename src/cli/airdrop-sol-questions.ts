import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'airdrop-sol' })
export class AirdropSolQuestions {
  @Question({
    type: 'list',
    name: 'cluster',
    choices: [
      {
        value: 'devnet',
        checked: true,
      },
      {
        value: 'testnet',
      },
    ],
    default: 'devnet',
    message: `Which cluster do you wish to use?`,
    validate: function (value: string) {
      if (value === 'devnet' || value === 'testnet') {
        return true;
      }
      return "Please enter either 'devnet' or 'testnet'";
    },
  })
  parseCluster(cluster: string): string {
    return cluster || 'devnet';
  }

  @Question({
    type: 'input',
    name: 'address',
    message: "What's the recipient wallet?",
    validate: function (value: string) {
      if (!value) return 'Please input a wallet address';
      else if (!PublicKey.isOnCurve(value)) {
        return 'Wallet address is not on curve';
      } else return true;
    },
  })
  parseAddress(address: string): PublicKey {
    return new PublicKey(address);
  }

  @Question({
    type: 'input',
    name: 'dropAmount',
    default: 1,
    message: 'How much SOL would you like to airdrop?',
    validate: function (value: string) {
      if (+value > 2) return 'Cannot drop more than 2 Sol';
      else if (+value <= 0) return 'Cannot drop 0 or less Sol';
      else if (!!value) return true;
      else return 'Faulty input';
    },
  })
  parseDropAmount(dropAmount: string): number {
    return parseInt(dropAmount, 10);
  }
}
