import { Test, TestingModule } from '@nestjs/testing';
import { WalletComicIssueService } from './wallet-comic-issue.service';

describe('WalletComicIssueService', () => {
  let service: WalletComicIssueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletComicIssueService],
    }).compile();

    service = module.get<WalletComicIssueService>(WalletComicIssueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
