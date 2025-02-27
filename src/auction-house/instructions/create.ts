import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';
import { getTreasuryPublicKey } from '../../utils/metaplex';
import { CreateAuctionHouseDto } from '../dto/create-auction-house.dto';
import { createNoopSigner, publicKey, Umi } from '@metaplex-foundation/umi';
import {
  create,
  CreateInstructionAccounts,
  CreateInstructionArgs,
  findAuctionHouseAssetVaultPda,
  findAuctionHouseFeePda,
  findAuctionHousePda,
  findAuctionHouseTreasuryPda,
} from 'core-auctions';
import { WRAPPED_SOL_MINT } from '@metaplex-foundation/js';
import {
  findAssociatedTokenPda,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';

export async function createAuctionHouse(
  umi: Umi,
  createAuctionHouseDto: CreateAuctionHouseDto,
  computePrice?: number,
) {
  const {
    treasuryMintAddress,
    sellerFeeBasisPoints,
    canChangeSalePrice,
    requiresSignOff,
  } = createAuctionHouseDto;
  const authorityPubkey = getTreasuryPublicKey();
  const authority = fromWeb3JsPublicKey(authorityPubkey);

  const treasuryMint = publicKey(treasuryMintAddress);
  const auctionHouse = findAuctionHousePda(umi, {
    creator: authority,
    treasuryMint: treasuryMint,
  })[0];
  const auctionHouseAssetVault = findAuctionHouseAssetVaultPda(umi, {
    auctionHouse: auctionHouse,
  })[0];
  const auctionHouseTreasury = findAuctionHouseTreasuryPda(umi, {
    auctionHouse,
  })[0];
  const auctionHouseFeeAccount = findAuctionHouseFeePda(umi, {
    auctionHouse,
  })[0];
  const treasuryWithdrawalDestinationOwner = authority;
  let treasuryWithdrawalDestination = authority;

  const isNative = treasuryMintAddress === WRAPPED_SOL_MINT.toString();
  if (!isNative) {
    treasuryWithdrawalDestination = findAssociatedTokenPda(umi, {
      mint: treasuryMint,
      owner: treasuryWithdrawalDestinationOwner,
    })[0];
  }

  const signer = createNoopSigner(authority);
  const createAuctionHouseInstructionData: CreateInstructionAccounts &
    CreateInstructionArgs = {
    authority,
    auctionHouse,
    auctionHouseAssetVault,
    auctionHouseTreasury,
    treasuryMint,
    treasuryWithdrawalDestination,
    treasuryWithdrawalDestinationOwner,
    auctionHouseFeeAccount,
    feeWithdrawalDestination: authority,
    payer: signer,
    sellerFeeBasisPoints,
    requiresSignOff: requiresSignOff ?? false,
    canChangeSalePrice: canChangeSalePrice ?? false,
  };

  let builder = create(umi, createAuctionHouseInstructionData);

  if (computePrice) {
    builder = builder.prepend(
      setComputeUnitPrice(umi, { microLamports: computePrice }),
    );
  }

  const transaction = builder.buildAndSign(umi);
  return transaction;
}
