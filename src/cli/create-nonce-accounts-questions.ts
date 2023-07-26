import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'create-nonce' })
export class CreateNonceAccountsQuestions {
  @Question({
    type: 'input',
    name: 'supply',
    message: 'supply of nonce accounts to create',
  })
  parseSupply(supply: number): number {
    return supply;
  }
}
