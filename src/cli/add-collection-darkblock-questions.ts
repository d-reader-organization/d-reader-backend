import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'add-collection-darkblock' })
export class AddCollectionDarkblockQuestion {
  @Question({
    type: 'input',
    name: 'comicIssueId',
    message: 'Id of the comic issue whose pdf will be attached',
  })
  parseComicIssueId(id: string): number {
    return +id;
  }
}
