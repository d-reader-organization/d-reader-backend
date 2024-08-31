import { BadRequestException } from '@nestjs/common';
import { Bid, ListingConfig, PrintEditionSaleConfig } from '@prisma/client';

export function assertListingConfig(
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

export function assertPrintEditionSaleConfig(
  printEditionSaleConfig: PrintEditionSaleConfig,
) {
  const { startDate, endDate, isActive, itemsMinted, supply } =
    printEditionSaleConfig;
  if (!isActive) {
    throw new BadRequestException('Sale is not active');
  }

  const currentDate = new Date();
  if (startDate > currentDate) {
    throw new BadRequestException('Sale has not started');
  } else if (endDate <= currentDate) {
    throw new BadRequestException('Sale has ended');
  }

  if (itemsMinted == supply) {
    throw new BadRequestException(`All print editions has been sold`);
  }
}
