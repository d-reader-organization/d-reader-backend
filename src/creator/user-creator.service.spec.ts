import { Test, TestingModule } from '@nestjs/testing';
import { UserCreatorService } from './user-creator.service';

describe('UserCreatorService', () => {
  let service: UserCreatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserCreatorService],
    }).compile();

    service = module.get<UserCreatorService>(UserCreatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
