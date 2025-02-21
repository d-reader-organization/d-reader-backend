import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCampaignDto } from './create-campaign.dto';
import { TransformStringToBoolean } from '../../utils/transform';

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @IsOptional()
  @TransformStringToBoolean()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCampaignFilesDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  cover?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  banner?: Express.Multer.File | null;

  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  logo?: Express.Multer.File | null;
}
