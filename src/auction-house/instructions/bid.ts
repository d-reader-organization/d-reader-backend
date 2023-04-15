import {
  AuctionHouse,
  Bid,
  Metaplex,
  NftWithToken,
  Pda,
  PublicKey,
  SftWithToken,
  SolAmount,
  SplTokenAmount,
  amount,
  lamports,
} from '@metaplex-foundation/js';
import {
  CancelInstructionAccounts,
  createBuyInstruction,
  createCancelBidReceiptInstruction,
  createCancelInstruction,
  createPrintBidReceiptInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import { createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import {
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { withdrawFromBuyerEscrow } from './withdrawFromBuyerEscrow';

export const constructPrivateBidInstruction = async (
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  buyer: PublicKey,
  mintAccount: PublicKey,
  priceObject: SolAmount | SplTokenAmount,
  tokens: SplTokenAmount,
  printReceipt: boolean,
  seller?: PublicKey,
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

  const tokenAccount = seller
    ? metaplex
        .tokens()
        .pdas()
        .associatedTokenAccount({ mint: mintAccount, owner: seller })
    : null;

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

  if (printReceipt) {
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
  }

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

export function constructCancelBidInstruction(
  metaplex: Metaplex,
  bid: Bid,
  auctionHouse: AuctionHouse,
): TransactionInstruction[] {
  const {
    asset,
    buyerAddress,
    tradeStateAddress,
    price,
    receiptAddress,
    tokens,
  } = bid;

  const {
    authorityAddress,
    address: auctionHouseAddress,
    feeAccountAddress,
  } = auctionHouse;

  const tokenAccount = (asset as NftWithToken | SftWithToken).token.address;

  const accounts: CancelInstructionAccounts = {
    wallet: buyerAddress,
    tokenAccount,
    tokenMint: asset.address,
    authority: authorityAddress,
    auctionHouse: auctionHouseAddress,
    auctionHouseFeeAccount: feeAccountAddress,
    tradeState: tradeStateAddress,
  };

  const instruction: TransactionInstruction[] = [];
  const args = {
    buyerPrice: price.basisPoints,
    tokenSize: tokens.basisPoints,
  };

  instruction.push(createCancelInstruction(accounts, args));
  if (!!receiptAddress) {
    instruction.push(
      createCancelBidReceiptInstruction({
        receipt: receiptAddress as Pda,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
      }),
    );
  }
  instruction.push(
    ...withdrawFromBuyerEscrow(metaplex, auctionHouse, buyerAddress, price),
  );

  return instruction;
}
