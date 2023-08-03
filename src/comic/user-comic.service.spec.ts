import { Test, TestingModule } from '@nestjs/testing';
import { UserComicService } from './user-comic.service';

describe('UserComicService', () => {
  let service: UserComicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserComicService],
    }).compile();

    service = module.get<UserComicService>(UserComicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
