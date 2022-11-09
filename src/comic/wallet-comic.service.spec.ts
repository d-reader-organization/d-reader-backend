import { Test, TestingModule } from '@nestjs/testing';
import { WalletComicService } from './wallet-comic.service';

describe('WalletComicService', () => {
  let service: WalletComicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletComicService],
    }).compile();

    service = module.get<WalletComicService>(WalletComicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
