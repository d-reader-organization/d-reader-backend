import { QuestionSet, Question } from 'nest-commander';

export enum TransactionIterationType {
  Parallel,
  Single,
}
@QuestionSet({ name: 'insert-items' })
export class InsertItemsQuestions {
  @Question({
    type: 'input',
    name: 'candyMachineAddress',
    message: "What's the candy machine address?",
    validate: function (value: string) {
      if (!value) return 'Please input a candy machine address';
      return true;
    },
  })
  parseCandyMachineAddress(candyMachineAddress: string): string {
    return candyMachineAddress;
  }

  @Question({
    type: 'list',
    name: 'iteration',
    choices: [{ value: 'Parallel', checked: true }, { value: 'Single' }],
    message: 'How would you like to iterate on transactions ?',
    validate: async function (value: string) {
      if (!value) {
        return 'Please provide a valid value';
      }
      return true;
    },
  })
  parseNonceStatus(iteration: string): TransactionIterationType {
    return TransactionIterationType[iteration];
  }
}
