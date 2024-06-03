import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'mint-remaining' })
export class MintRemainingQuestions {
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
    name: 'supply',
    message: 'Number of nfts to mint?',
  })
  parseSupply(supply: number): number {
    return supply;
  }
}
