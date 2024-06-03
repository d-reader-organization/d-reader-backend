import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'bundlr-fund' })
export class BundlrFundQuestions {
  @Question({
    type: 'input',
    name: 'fundAmount',
    default: 1,
    message: 'How much SOL would you like to fund bundlr with?',
    validate: function (value: string) {
      if (!!value) return true;
      else return 'Faulty input';
    },
  })
  parseFundAmount(fundAmount: string): number {
    return parseFloat(fundAmount);
  }
}
