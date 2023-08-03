import { Test, TestingModule } from '@nestjs/testing';
import { UserComicIssueService } from './user-comic-issue.service';

describe('UserComicIssueService', () => {
  let service: UserComicIssueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserComicIssueService],
    }).compile();

    service = module.get<UserComicIssueService>(UserComicIssueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
