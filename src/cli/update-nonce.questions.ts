import { DurableNonceStatus } from '@prisma/client';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'update-nonce' })
export class UpdateNonceQuestions {
  @Question({
    type: 'list',
    name: 'status',
    choices: [
      {
        value: 'Available',
        checked: true,
      },
      {
        value: 'InUse',
      },
      {
        value: 'All',
      },
    ],
    message: 'What status of Nonces you want to update ?',
    validate: async function (value: string) {
      if (!value) {
        return 'Please provide a valid value';
      }
      return true;
    },
  })
  parseNonceStatus(status: string): DurableNonceStatus {
    if (status == 'All') return;
    return DurableNonceStatus[status];
  }
}
