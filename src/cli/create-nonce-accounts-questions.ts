import { isNumber } from 'lodash';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'create-nonce' })
export class CreateNonceAccountsQuestions {
  @Question({
    type: 'input',
    name: 'supply',
    message: 'supply of nonce accounts to create',
    validate: function (value: number) {
      return isNumber(value);
    },
  })
  parseSupply(supply: number): number {
    return supply;
  }
}
