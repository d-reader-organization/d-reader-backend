import { Test, TestingModule } from '@nestjs/testing';
import { ComicIssueController } from './comic-issue.controller';
import { ComicIssueService } from './comic-issue.service';

describe('ComicIssueController', () => {
  let controller: ComicIssueController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComicIssueController],
      providers: [ComicIssueService],
    }).compile();

    controller = module.get<ComicIssueController>(ComicIssueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
