import { Test, TestingModule } from '@nestjs/testing';
import { ComicController } from './comic.controller';
import { ComicService } from './comic.service';

describe('ComicController', () => {
  let controller: ComicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComicController],
      providers: [ComicService],
    }).compile();

    controller = module.get<ComicController>(ComicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
