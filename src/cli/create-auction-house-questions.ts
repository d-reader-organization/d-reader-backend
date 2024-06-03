import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'create-auction-house' })
export class CreateAuctionHouseQuestions {
  @Question({
    type: 'list',
    name: 'cluster',
    choices: [
      {
        value: 'devnet',
        checked: true,
      },
      {
        value: 'mainnet-beta',
      },
    ],
    default: 'devnet',
    message: `Which cluster do you wish to use?`,
    validate: function (value: string) {
      if (value === 'devnet' || value === 'mainnet-beta') {
        return true;
      }
      return "Please enter either 'devnet' or 'mainnet-beta'";
    },
  })
  parseCluster(cluster: string): string {
    return cluster || 'devnet';
  }
}
