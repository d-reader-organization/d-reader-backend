import { Test, TestingModule } from '@nestjs/testing';
import { s3Service } from './s3.service';

describe('s3Service', () => {
  let service: s3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [s3Service],
    }).compile();

    service = module.get<s3Service>(s3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
