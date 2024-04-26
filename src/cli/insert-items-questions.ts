import { QuestionSet, Question } from 'nest-commander';

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
}
