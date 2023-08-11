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
}
