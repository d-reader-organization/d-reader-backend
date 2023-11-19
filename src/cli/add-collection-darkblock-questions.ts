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

  @Question({
    type: 'input',
    name: 'fileHash',
    message:
      'SHA256 hash of the file to be attached. You can hash your file here: https://random-crap-public.s3.amazonaws.com/standalone_upgrader.html',
  })
  parseFileHash(fileHash: string): string {
    return fileHash;
  }
}
