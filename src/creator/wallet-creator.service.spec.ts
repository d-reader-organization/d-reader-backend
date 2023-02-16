import { Test, TestingModule } from '@nestjs/testing';
import { WalletCreatorService } from './wallet-creator.service';

describe('WalletCreatorService', () => {
  let service: WalletCreatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletCreatorService],
    }).compile();

    service = module.get<WalletCreatorService>(WalletCreatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
