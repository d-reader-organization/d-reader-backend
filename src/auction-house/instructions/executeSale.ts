import { Metaplex, lamports } from '@metaplex-foundation/js';
import { AuctionHouse } from '@metaplex-foundation/js';
import {
  ExecuteSaleInstructionAccounts,
  createExecuteSaleInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import {
  AccountMeta,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { PartialListing } from '../dto/types/partial-listing';
import { BidModel } from '../dto/types/bid-model';
import { AUTH_RULES, AUTH_RULES_ID } from '../../constants';

export function constructExecuteSaleInstruction(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  listing: PartialListing,
  bid: BidModel,
): TransactionInstruction {
  const { sellerAddress, asset } = listing;
  const { buyerAddress } = bid;
  const {
    treasuryMint,
    address: auctionHouseAddress,
    authorityAddress,
    feeAccountAddress,
    treasuryAccountAddress,
  } = auctionHouse;

  const { tokens, price } = bid;
  const buyerReceiptTokenAccount = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({
      mint: asset.address,
      owner: buyerAddress,
    });

  const escrowPayment = metaplex.auctionHouse().pdas().buyerEscrow({
    auctionHouse: auctionHouseAddress,
    buyer: buyerAddress,
  });
  const freeTradeState = metaplex
    .auctionHouse()
    .pdas()
    .tradeState({
      auctionHouse: auctionHouseAddress,
      wallet: sellerAddress,
      treasuryMint: treasuryMint.address,
      tokenMint: asset.address,
      price: lamports(0).basisPoints,
      tokenSize: tokens.basisPoints,
      tokenAccount: asset.token.address,
    });

  const programAsSigner = metaplex.auctionHouse().pdas().programAsSigner();
  const accounts: ExecuteSaleInstructionAccounts = {
    buyer: buyerAddress,
    seller: sellerAddress,
    tokenAccount: asset.token.address,
    tokenMint: asset.address,
    metadata: asset.metadataAddress,
    treasuryMint: treasuryMint.address,
    escrowPaymentAccount: escrowPayment,
    sellerPaymentReceiptAccount: sellerAddress,
    buyerReceiptTokenAccount,
    authority: authorityAddress,
    auctionHouse: auctionHouseAddress,
    auctionHouseFeeAccount: feeAccountAddress,
    auctionHouseTreasury: treasuryAccountAddress,
    buyerTradeState: bid.tradeStateAddress,
    sellerTradeState: listing.tradeStateAddress,
    freeTradeState,
    programAsSigner,
  };

  const args = {
    freeTradeStateBump: freeTradeState.bump,
    escrowPaymentBump: escrowPayment.bump,
    programAsSignerBump: programAsSigner.bump,
    buyerPrice: price.basisPoints,
    tokenSize: tokens.basisPoints,
  };
  const executeSaleInstruction = createExecuteSaleInstruction(accounts, args);
  asset.creators.forEach(({ address }) => {
    executeSaleInstruction.keys.push({
      pubkey: new PublicKey(address),
      isWritable: true,
      isSigner: false,
    });
  });
  executeSaleInstruction.keys.push(
    ...getExecuteSaleRemainingAccounts(
      metaplex,
      asset.address,
      sellerAddress,
      buyerAddress,
    ),
  );

  // //Make auction house authoirity as signer
  const authorityIndex = executeSaleInstruction.keys.findIndex((key) =>
    key.pubkey.equals(authorityAddress),
  );
  executeSaleInstruction.keys[authorityIndex].isSigner = true;

  //Make metadata as mutable
  const metadataIndex = executeSaleInstruction.keys.findIndex((key) =>
    key.pubkey.equals(asset.metadataAddress),
  );
  executeSaleInstruction.keys[metadataIndex].isWritable = true;

  return executeSaleInstruction;
}

function getExecuteSaleRemainingAccounts(
  metaplex: Metaplex,
  mint: PublicKey,
  seller: PublicKey,
  buyer: PublicKey,
): AccountMeta[] {
  const sellerAta = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({ mint, owner: seller });
  const buyerAta = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({ mint, owner: buyer });
  return [
    {
      isSigner: false,
      isWritable: false,
      pubkey: metaplex.programs().getTokenMetadata().address,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: metaplex.nfts().pdas().masterEdition({ mint }),
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: metaplex.nfts().pdas().tokenRecord({ mint, token: sellerAta }),
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: metaplex.nfts().pdas().tokenRecord({ mint, token: buyerAta }),
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: AUTH_RULES_ID,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: AUTH_RULES,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
    },
  ];
}
