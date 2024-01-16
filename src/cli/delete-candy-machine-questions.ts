import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'delete-candy-machine' })
export class DeleteCandyMachineQuestions {
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
}
