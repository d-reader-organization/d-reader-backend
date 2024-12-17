import { plainToInstance } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';
import { getPublicUrl } from 'src/aws/s3client';

export class LaunchpadDto {
  @IsString()
  id: string;

  @IsString()
  issueTitle: string;

  @IsNumber()
  price: number;

  @IsNumber()
  supply: number;

  @IsNumber()
  minted: number;

  @IsUrl()
  image: string;

  @IsOptional()
  @IsDate()
  startsAt?: Date;
}

export type LaunchpadInput = {
  id: string;
  issueTitle: string;
  price: number;
  itemsMinted: number;
  supply: number;
  banner: string;
  startsAt?: Date;
};

export function toLaunchpadDto(input: LaunchpadInput) {
  const plainLaunchpadDto: LaunchpadDto = {
    id: input.id,
    issueTitle: input.issueTitle,
    price: input.price,
    minted: Math.ceil((input.itemsMinted * 100) / input.supply),
    image: getPublicUrl(input.banner),
    supply: input.supply,
    startsAt: input.startsAt,
  };

  const launchpadDto = plainToInstance(LaunchpadDto, plainLaunchpadDto);
  return launchpadDto;
}

export function toLaunchpadDtoArray(inputs: LaunchpadInput[]) {
  return inputs.map(toLaunchpadDto);
}
