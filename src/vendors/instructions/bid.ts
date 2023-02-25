import {
  AuctionHouse,
  Metaplex,
  PublicKey,
  SolAmount,
  SplTokenAmount,
  amount,
  lamports,
} from '@metaplex-foundation/js';
import {
  createBuyInstruction,
  createPrintBidReceiptInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import { createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import {
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';

export const constructPrivateBidInstruction = async (
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  buyer: PublicKey,
  mintAccount: PublicKey,
  priceObject: SolAmount | SplTokenAmount,
  tokens: SplTokenAmount,
  seller?: PublicKey,
  associatedTokenAccount?: PublicKey,
): Promise<TransactionInstruction[]> => {
  const priceBasisPoint = priceObject?.basisPoints ?? 0;
  const price = auctionHouse.isNative
    ? lamports(priceBasisPoint)
    : amount(priceBasisPoint, auctionHouse.treasuryMint.currency);

  const authority = auctionHouse.authorityAddress;
  const metadata = metaplex.nfts().pdas().metadata({
    mint: mintAccount,
  });

  const escrowPayment = metaplex.auctionHouse().pdas().buyerEscrow({
    auctionHouse: auctionHouse.address,
    buyer,
  });

  const tokenAccount =
    associatedTokenAccount ??
    (seller
      ? metaplex.tokens().pdas().associatedTokenAccount({
          mint: mintAccount,
          owner: seller,
        })
      : null);

  const buyerTokenAccount = metaplex.tokens().pdas().associatedTokenAccount({
    mint: mintAccount,
    owner: buyer,
  });

  const buyerTradeState = metaplex.auctionHouse().pdas().tradeState({
    auctionHouse: auctionHouse.address,
    wallet: buyer,
    treasuryMint: auctionHouse.treasuryMint.address,
    tokenMint: mintAccount,
    price: price.basisPoints,
    tokenSize: tokens.basisPoints,
    tokenAccount,
  });

  const accounts = {
    wallet: buyer,
    paymentAccount: buyer,
    transferAuthority: buyer,
    treasuryMint: auctionHouse.treasuryMint.address,
    metadata,
    escrowPaymentAccount: escrowPayment,
    authority: authority,
    auctionHouse: auctionHouse.address,
    auctionHouseFeeAccount: auctionHouse.feeAccountAddress,
    buyerTradeState,
  };

  const args = {
    tradeStateBump: buyerTradeState.bump,
    escrowPaymentBump: escrowPayment.bump,
    buyerPrice: price.basisPoints,
    tokenSize: tokens.basisPoints,
  };

  const instructions: TransactionInstruction[] = [];

  // Buy Instruction.
  const buyInstruction = createBuyInstruction(
    { ...accounts, tokenAccount },
    args,
  );

  // Make buyer as signer since createBuyInstruction don't assign a signer.
  const signerKeyIndex = buyInstruction.keys.findIndex(({ pubkey }) =>
    pubkey.equals(buyer),
  );

  buyInstruction.keys[signerKeyIndex].isSigner = true;

  instructions.push(buyInstruction);

  const receipt = metaplex.auctionHouse().pdas().bidReceipt({
    tradeState: buyerTradeState,
  });

  instructions.push(
    createPrintBidReceiptInstruction(
      {
        receipt,
        bookkeeper: buyer,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      { receiptBump: receipt.bump },
    ),
  );

  if (!tokenAccount) {
    const account = await metaplex.rpc().getAccount(buyerTokenAccount);
    if (!account.exists) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          buyer,
          buyerTokenAccount,
          buyer,
          mintAccount,
        ),
      );
    }
  }

  return instructions;
};
