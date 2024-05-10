import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'fetch-collection-sale-details' })
export class FetchCollectionSaleDetailsQuestions {
  @Question({
    type: 'input',
    name: 'collection',
    message: 'Address of the collection to fetch sale details for',
    validate: async function (collection: string) {
      if (!collection) return false;
      return true;
    },
  })
  parseCollectionAddresses(address: string): string {
    return address;
  }

  @Question({
    type: 'input',
    name: 'parentCollection',
    message: 'Address of the collection of parent company (if any)',
  })
  parseParentCollectionAddresses(address?: string): string | undefined {
    return address;
  }
}
