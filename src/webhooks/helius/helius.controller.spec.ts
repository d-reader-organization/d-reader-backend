import { Test, TestingModule } from '@nestjs/testing';
import { HeliusController } from './helius.controller';
import { HeliusService } from './helius.service';

describe('HeliusController', () => {
  let controller: HeliusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeliusController],
      providers: [HeliusService],
    }).compile();

    controller = module.get<HeliusController>(HeliusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
