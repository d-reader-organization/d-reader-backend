import { Test, TestingModule } from '@nestjs/testing';
import { ComicPageService } from './comic-page.service';

describe('ComicPageService', () => {
  let service: ComicPageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComicPageService],
    }).compile();

    service = module.get<ComicPageService>(ComicPageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
