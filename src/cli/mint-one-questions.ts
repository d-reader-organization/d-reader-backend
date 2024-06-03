import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';
import { PUBLIC_GROUP_LABEL } from '../constants';

@QuestionSet({ name: 'mint' })
export class MintOneQuestions {
  @Question({
    type: 'input',
    name: 'candyMachineAddress',
    message: "What's the candy machine address?",
    validate: function (value: string) {
      if (!value) return 'Please input a candy machine address';
      else if (!PublicKey.isOnCurve(value)) {
        return 'Candy machine address is not on curve';
      } else return true;
    },
  })
  parseCandyMachineAddress(candyMachineAddress: string): PublicKey {
    return new PublicKey(candyMachineAddress);
  }

  @Question({
    type: 'input',
    name: 'label',
    default: PUBLIC_GROUP_LABEL,
    message: 'group label (defaults to public group)',
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
