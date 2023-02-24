import {
  AuctionHouse,
  Metaplex,
  PublicKey,
  SolAmount,
  SplTokenAmount,
  amount,
  lamports,
} from '@metaplex-foundation/js';
import { createBuyInstruction } from '@metaplex-foundation/mpl-auction-house';
import { createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { TransactionInstruction } from '@solana/web3.js';

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

  // Accounts.
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

  //handle properly
  if (!tokenAccount) {
    return;
  }

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

  // Args.
  const args = {
    tradeStateBump: buyerTradeState.bump,
    escrowPaymentBump: escrowPayment.bump,
    buyerPrice: price.basisPoints,
    tokenSize: tokens.basisPoints,
  };

  const instructions: TransactionInstruction[] = [];

  // Sell Instruction.
  const buyInstruction = createBuyInstruction(
    { ...accounts, tokenAccount },
    args,
  );

  // Update the accounts to be signers since it's not covered properly by MPL due to its dynamic nature.
  const signerKeyIndex = buyInstruction.keys.findIndex(({ pubkey }) =>
    pubkey.equals(buyer),
  );

  buyInstruction.keys[signerKeyIndex].isSigner = true;

  instructions.push(buyInstruction);

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
