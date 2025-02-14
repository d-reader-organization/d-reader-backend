import { IsArray, IsNumber, IsString } from 'class-validator';
import {
  toUserInterestedReceiptDtoArray,
  UserInterestedReceiptDto,
  UserInterestedReceiptInput,
} from './userInterestedReceipt.dto';
import { plainToInstance, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProjectReferralCampaignReceiptDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsArray()
  @ApiProperty({ isArray: true })
  @Type(() => UserInterestedReceiptDto)
  receipts: UserInterestedReceiptDto[];

  @IsNumber()
  totalReferred: number;
}

export type ProjectReferralCampaignReceiptInput = {
  title: string;
  slug: string;
  totalReferred: number;
  receipts: UserInterestedReceiptInput[];
};

export function toProjectReferralCampaignReceiptDto(
  input: ProjectReferralCampaignReceiptInput,
) {
  const plainProjectReferralCampaignReceiptDto: ProjectReferralCampaignReceiptDto =
    {
      title: input.title,
      slug: input.slug,
      totalReferred: input.totalReferred,
      receipts: toUserInterestedReceiptDtoArray(input.receipts),
    };

  const projectReferralCampaignReceiptDto = plainToInstance(
    ProjectReferralCampaignReceiptDto,
    plainProjectReferralCampaignReceiptDto,
  );
  return projectReferralCampaignReceiptDto;
}

export function toProjectReferralCampaignReceiptDtoArray(
  inputs: ProjectReferralCampaignReceiptInput[],
) {
  return inputs.map(toProjectReferralCampaignReceiptDto);
}
