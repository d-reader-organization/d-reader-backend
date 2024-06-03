import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'create-nonce' })
export class CreateNonceQuestions {
  @Question({
    type: 'input',
    name: 'count',
    message: 'How many nonce accounts you want to create ?',
    validate: function (value: string) {
      if (!value) return false;
      return true;
    },
  })
  parseNonceCount(count: string): number {
    return +count;
  }
}
