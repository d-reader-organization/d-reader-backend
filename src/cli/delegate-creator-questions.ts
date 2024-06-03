import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'delegate-creator' })
export class DelegateCreatorQuestions {
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
    name: 'newCreator',
    message: "What's address of creator to delegate signing authority",
    validate: function (value: string) {
      if (!value) return 'Please input the new creator address';
      else if (!PublicKey.isOnCurve(value)) {
        return 'Address is not on curve';
      } else return true;
    },
  })
  parseNewCreator(newCreator: string): PublicKey {
    return new PublicKey(newCreator);
  }
}
