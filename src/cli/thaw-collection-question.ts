import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'thaw-collection' })
export class ThawCollectionQuestions {
  @Question({
    type: 'input',
    name: 'candyMachineAddress',
    message: 'address of candymachine',
    validate: async function (value: string) {
      if (value && !PublicKey.isOnCurve(value)) {
        return 'Address must be a solana address';
      }
      return true;
    },
  })
  parseCandyMachineAddress(candyMachine: string): string {
    return candyMachine;
  }

  @Question({
    type: 'input',
    name: 'comicIssueId',
    message: 'ComicIssue Id of the primary sale',
  })
  parseComicIssueId(id: string): number {
    return +id;
  }
}
