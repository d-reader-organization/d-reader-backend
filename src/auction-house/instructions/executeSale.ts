import { Bid, Listing, Metaplex, lamports } from '@metaplex-foundation/js';
import { AuctionHouse } from '@metaplex-foundation/js';
import { createExecuteSaleInstruction } from '@metaplex-foundation/mpl-auction-house';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

export function constructExecuteSaleInstruction(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  listing: Listing,
  bid: Bid,
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
  const accounts = {
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

  return executeSaleInstruction;
}
