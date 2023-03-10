import {
  AuctionHouse,
  Listing,
  Metaplex,
  Pda,
  SolAmount,
  SplTokenAmount,
  amount,
  lamports,
} from '@metaplex-foundation/js';
import {
  CancelInstructionAccounts,
  createCancelInstruction,
  createCancelListingReceiptInstruction,
  createPrintListingReceiptInstruction,
  createSellInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import {
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';

export function constructListInstruction(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  mintAccount: PublicKey,
  seller: PublicKey,
  priceObject: SolAmount | SplTokenAmount,
  printReceipt: boolean,
  tokens?: SplTokenAmount,
  associatedTokenAccount?: PublicKey,
): TransactionInstruction[] {
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
    authority: metaplex.identity().publicKey,
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

  // Make seller as signer since createSellInstruction don't assign a signer
  const signerKeyIndex = sellInstruction.keys.findIndex((key) =>
    key.pubkey.equals(seller),
  );
  sellInstruction.keys[signerKeyIndex].isSigner = true;
  sellInstruction.keys[signerKeyIndex].isWritable = true;

  instructions.push(sellInstruction);

  if (printReceipt) {
    const receipt = metaplex.auctionHouse().pdas().listingReceipt({
      tradeState: sellerTradeState,
    });

    instructions.push(
      createPrintListingReceiptInstruction(
        {
          receipt,
          bookkeeper: seller,
          instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        { receiptBump: receipt.bump },
      ),
    );
  }

  return instructions;
}

export function constructCancelListingInstruction(
  listing: Listing,
  auctionHouse: AuctionHouse,
) {
  const {
    asset,
    sellerAddress,
    receiptAddress,
    tradeStateAddress,
    price,
    tokens,
  } = listing;

  const { address, authorityAddress, feeAccountAddress } = auctionHouse;

  const accounts: CancelInstructionAccounts = {
    wallet: sellerAddress,
    tokenAccount: asset.token.address,
    tokenMint: asset.address,
    authority: authorityAddress,
    auctionHouse: address,
    auctionHouseFeeAccount: feeAccountAddress,
    tradeState: tradeStateAddress,
  };

  const args = {
    buyerPrice: price.basisPoints,
    tokenSize: tokens.basisPoints,
  };

  const instructions: TransactionInstruction[] = [];
  instructions.push(createCancelInstruction(accounts, args));

  if (!!receiptAddress) {
    instructions.push(
      createCancelListingReceiptInstruction({
        receipt: receiptAddress as Pda,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
      }),
    );
  }

  return instructions;
}
