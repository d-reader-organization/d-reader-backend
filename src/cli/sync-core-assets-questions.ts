import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'sync-core-asset' })
export class SyncCoreAssetsQuestions {
  @Question({
    type: 'input',
    name: 'collection',
    message: 'Address of the collection to sync',
    validate: async function (collection: string) {
      if (!collection) return false;
      return true;
    },
  })
  parseCollectionAddresses(address: string): string {
    return address;
  }
}
