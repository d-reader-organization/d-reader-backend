import { plainToInstance } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class CampaignStatsDto {
  @IsNumber()
  numberOfUsersPledged: number;

  @IsNumber()
  expectedPledgedAmount: number;

  @IsOptional()
  @IsNumber()
  userExpressedAmount?: number;
}

export type CampaignStatsInput = {
  numberOfUsersPledged: number;
  expectedPledgedAmount: number;
  userExpressedAmount?: number;
};

export function toCampaignStatsDto(input: CampaignStatsInput) {
  const plainCampaignStatsDto: CampaignStatsDto = {
    numberOfUsersPledged: input.numberOfUsersPledged,
    expectedPledgedAmount: input.expectedPledgedAmount,
    userExpressedAmount: input.userExpressedAmount,
  };

  const campaignStats = plainToInstance(
    CampaignStatsDto,
    plainCampaignStatsDto,
  );
  return campaignStats;
}

export function toCampaignStatsDtoArray(inputs: CampaignStatsInput[]) {
  return inputs.map(toCampaignStatsDto);
}
