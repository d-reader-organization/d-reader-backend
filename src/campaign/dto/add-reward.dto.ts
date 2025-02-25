import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddCampaignRewardBodyDto {
  @IsString()
  @MaxLength(48)
  name: string;

  @IsNumber()
  price: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  supply?: number;
}

export class AddCampaignRewardFileDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  @Transform(({ value }) => value[0])
  @IsOptional()
  image?: Express.Multer.File | null;
}

export class AddCampaignRewardDto extends IntersectionType(
  AddCampaignRewardBodyDto,
  AddCampaignRewardFileDto,
) {}
