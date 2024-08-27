import { BadRequestException } from '@nestjs/common';
import { Bid, ListingConfig } from '@prisma/client';

export function assetListingConfig(
  listingConfig: ListingConfig,
  bidPrice: number,
  highestBid?: Bid,
) {
  const { startDate, endDate, reservePrice, minBidIncrement } = listingConfig;
  const currentDate = new Date();
  if (startDate > currentDate) {
    throw new BadRequestException('Auction has not started');
  } else if (endDate <= currentDate) {
    throw new BadRequestException('Auction has ended');
  }

  if (bidPrice < reservePrice) {
    throw new BadRequestException(
      `Bid price required to be atleast ${reservePrice}`,
    );
  }

  if (highestBid) {
    const highestBidAmount = Number(highestBid.amount);

    if (highestBidAmount >= bidPrice) {
      throw new BadRequestException(
        `Bid price required to be greater than the highest bid ${highestBidAmount}`,
      );
    } else if (highestBidAmount + minBidIncrement > bidPrice) {
      throw new BadRequestException(
        `Next bid requires to be atleast ${highestBidAmount + minBidIncrement}`,
      );
    }
  }
}
