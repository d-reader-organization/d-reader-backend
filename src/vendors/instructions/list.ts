import {
  AuctionHouse,
  Metaplex,
  SolAmount,
  SplTokenAmount,
  amount,
  lamports,
} from '@metaplex-foundation/js';
import {
  createPrintListingReceiptInstruction,
  createSellInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import { TransactionInstruction } from '@solana/web3.js';
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';

export async function constructListInstruction(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  mintAccount: PublicKey,
  tokens: SplTokenAmount,
  seller: PublicKey,
  priceObject: SolAmount | SplTokenAmount,
  associatedTokenAccount?: PublicKey,
) {
  const priceBasisPoint = priceObject.basisPoints ?? 0;

  const price = auctionHouse.isNative
    ? lamports(priceBasisPoint)
    : amount(priceBasisPoint, auctionHouse.treasuryMint.currency);

  // Accounts.
  const metadata = metaplex.nfts().pdas().metadata({
    mint: mintAccount,
  });

  const tokenAccount =
    associatedTokenAccount ??
    metaplex.tokens().pdas().associatedTokenAccount({
      mint: mintAccount,
      owner: seller,
    });

  const sellerTradeState = metaplex.auctionHouse().pdas().tradeState({
    auctionHouse: auctionHouse.address,
    wallet: seller,
    treasuryMint: auctionHouse.treasuryMint.address,
    tokenMint: mintAccount,
    price: price.basisPoints,
    tokenSize: tokens.basisPoints,
    tokenAccount,
  });

  const freeSellerTradeState = metaplex
    .auctionHouse()
    .pdas()
    .tradeState({
      auctionHouse: auctionHouse.address,
      wallet: seller,
      treasuryMint: auctionHouse.treasuryMint.address,
      tokenMint: mintAccount,
      price: lamports(0).basisPoints,
      tokenSize: tokens.basisPoints,
      tokenAccount,
    });

  const programAsSigner = metaplex.auctionHouse().pdas().programAsSigner();

  const accounts = {
    wallet: seller,
    tokenAccount,
    metadata,
    authority: seller,
    auctionHouse: auctionHouse.address,
    auctionHouseFeeAccount: auctionHouse.feeAccountAddress,
    sellerTradeState,
    freeSellerTradeState,
    programAsSigner,
  };

  // Args.
  const args = {
    tradeStateBump: sellerTradeState.bump,
    freeTradeStateBump: freeSellerTradeState.bump,
    programAsSignerBump: programAsSigner.bump,
    buyerPrice: price.basisPoints,
    tokenSize: tokens.basisPoints,
  };
  const instructions: TransactionInstruction[] = [];

  // Sell Instruction.
  const sellInstruction = createSellInstruction(accounts, args);

  // Update the account to be a signer since it's not covered properly by MPL due to its dynamic nature.
  const signerKeyIndex = sellInstruction.keys.findIndex((key) =>
    key.pubkey.equals(seller),
  );
  sellInstruction.keys[signerKeyIndex].isSigner = true;
  sellInstruction.keys[signerKeyIndex].isWritable = true;

  instructions.push(sellInstruction);

  // Receipt.
  const bookkeeper = metaplex.identity();
  const receipt = metaplex.auctionHouse().pdas().listingReceipt({
    tradeState: sellerTradeState,
  });

  // Print list receipt
  instructions.push(
    createPrintListingReceiptInstruction(
      {
        receipt,
        bookkeeper: bookkeeper.publicKey,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      { receiptBump: receipt.bump },
    ),
  );

  return instructions;
}
