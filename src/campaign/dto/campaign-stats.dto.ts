import { plainToInstance } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class CampaignStatsDto {
  @IsNumber()
  tentativeBackers: number;

  @IsNumber()
  tentativeAmountPledged: number;

  @IsOptional()
  @IsNumber()
  myTentativeAmount?: number;
}

export type CampaignStatsInput = {
  tentativeBackers: number;
  tentativeAmountPledged: number;
  myTentativeAmount?: number;
};

export function toCampaignStatsDto(input: CampaignStatsInput) {
  const plainCampaignStatsDto: CampaignStatsDto = {
    tentativeBackers: input.tentativeBackers,
    tentativeAmountPledged: input.tentativeAmountPledged,
    myTentativeAmount: input.myTentativeAmount,
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
