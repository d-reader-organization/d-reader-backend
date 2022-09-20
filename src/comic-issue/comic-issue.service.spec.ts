import { Test, TestingModule } from '@nestjs/testing';
import { ComicIssueService } from './comic-issue.service';

describe('ComicIssueService', () => {
  let service: ComicIssueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComicIssueService],
    }).compile();

    service = module.get<ComicIssueService>(ComicIssueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
