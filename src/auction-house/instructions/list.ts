import {
  AuctionHouse,
  Metaplex,
  Pda,
  SolAmount,
  SplTokenAmount,
  lamports,
  toMetadata,
  toMetadataAccount,
  token,
} from '@metaplex-foundation/js';
import {
  CancelInstructionAccounts,
  SellInstructionAccounts,
  createCancelInstruction,
  createCancelListingReceiptInstruction,
  createPrintListingReceiptInstruction,
  createSellInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import {
  AccountMeta,
  ComputeBudgetProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { solFromLamports } from '../../utils/helpers';
import { Nft, Listing } from '@prisma/client';
import { PartialListing } from '../dto/types/partial-listing';
import {
  AUTH_RULES,
  AUTH_RULES_ID,
  MIN_COMPUTE_PRICE_IX,
} from '../../constants';
import { metaplex } from '../../utils/metaplex';

export async function constructListInstruction(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  mintAccount: PublicKey,
  seller: PublicKey,
  priceObject: SolAmount | SplTokenAmount,
  printReceipt: boolean,
  tokens: SplTokenAmount,
): Promise<TransactionInstruction[]> {
  const priceBasisPoint = priceObject.basisPoints ?? 0;

  const price = lamports(priceBasisPoint);
  const metadata = metaplex.nfts().pdas().metadata({
    mint: mintAccount,
  });

  const tokenAccount = metaplex.tokens().pdas().associatedTokenAccount({
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

  const accounts: SellInstructionAccounts = {
    wallet: seller,
    tokenAccount,
    metadata,
    authority: metaplex.identity().publicKey,
    auctionHouse: auctionHouse.address,
    auctionHouseFeeAccount: auctionHouse.feeAccountAddress,
    sellerTradeState,
    freeSellerTradeState,
    programAsSigner,
    anchorRemainingAccounts: await getSellRemainingAccounts(
      metaplex,
      mintAccount,
      seller,
    ),
  };

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

  // Make metadata mutable since createSellInstruction don't assign it as mutable
  const metadataKeyIndex = sellInstruction.keys.findIndex((key) =>
    key.pubkey.equals(metadata),
  );
  sellInstruction.keys[metadataKeyIndex].isWritable = true;

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

async function getSellRemainingAccounts(
  metaplex: Metaplex,
  mint: PublicKey,
  owner: PublicKey,
): Promise<AccountMeta[]> {
  const token = metaplex.tokens().pdas().associatedTokenAccount({
    mint,
    owner,
  });
  return [
    {
      isSigner: false,
      isWritable: false,
      pubkey: metaplex.programs().getTokenMetadata().address,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: metaplex.nfts().pdas().tokenRecord({ mint, token }),
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: metaplex.nfts().pdas().tokenRecord({ mint, token }),
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: mint,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: metaplex.nfts().pdas().masterEdition({ mint }),
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

export async function constructListTransaction(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  seller: PublicKey,
  mintAccount: PublicKey,
  price: number,
  printReceipt: boolean,
) {
  const listInstruction = await constructListInstruction(
    metaplex,
    auctionHouse,
    mintAccount,
    seller,
    solFromLamports(price),
    printReceipt,
    token(1, 0),
  );
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const listTransaction = new Transaction({
    feePayer: seller,
    ...latestBlockhash,
  }).add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }),
    MIN_COMPUTE_PRICE_IX,
    ...listInstruction,
  );

  const rawTransaction = listTransaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return rawTransaction.toString('base64');
}

export function constructCancelListingInstruction(
  listing: PartialListing,
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
    anchorRemainingAccounts: getCancelRemainingAccounts(
      metaplex,
      asset.address,
      sellerAddress,
    ),
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

export function getCancelRemainingAccounts(
  metaplex: Metaplex,
  mint: PublicKey,
  owner: PublicKey,
): AccountMeta[] {
  const token = metaplex.tokens().pdas().associatedTokenAccount({
    mint,
    owner,
  });
  const metadata = metaplex.nfts().pdas().metadata({
    mint,
  });
  return [
    {
      isSigner: false,
      isWritable: false,
      pubkey: metaplex.programs().getTokenMetadata().address,
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: metaplex.nfts().pdas().tokenRecord({ mint, token }),
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: metaplex.auctionHouse().pdas().programAsSigner(),
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: metadata,
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: metaplex.nfts().pdas().masterEdition({ mint }),
    },
    {
      isSigner: false,
      isWritable: true,
      pubkey: metaplex.nfts().pdas().tokenRecord({ mint, token }),
    },
    {
      isSigner: false,
      isWritable: false,
      pubkey: mint,
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
    {
      isSigner: false,
      isWritable: false,
      pubkey: SystemProgram.programId,
    },
  ];
}

export async function constructCancelListingTransaction(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  listing: PartialListing,
) {
  const cancelListingTransaction = constructCancelListingInstruction(
    listing,
    auctionHouse,
  );
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const listingTransaction = new Transaction({
    feePayer: listing.sellerAddress,
    ...latestBlockhash,
  }).add(...cancelListingTransaction);

  const rawTransaction = listingTransaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return rawTransaction.toString('base64');
}

export async function toListing(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  listing: Listing & { nft: Nft },
): Promise<PartialListing> {
  const address = new PublicKey(listing.nftAddress);
  const sellerAddress = new PublicKey(listing.nft.ownerAddress);
  const tokenAccount = metaplex.tokens().pdas().associatedTokenAccount({
    mint: address,
    owner: sellerAddress,
  });

  const price = lamports(listing.price);
  const tokens = token(1, 0, listing.symbol); // only considers nfts
  const tradeStateAddress = metaplex.auctionHouse().pdas().tradeState({
    auctionHouse: auctionHouse.address,
    wallet: sellerAddress,
    treasuryMint: auctionHouse.treasuryMint.address,
    tokenMint: address,
    price: price.basisPoints,
    tokenSize: tokens.basisPoints,
    tokenAccount,
  });

  const metadataAddress = metaplex.nfts().pdas().metadata({ mint: address });
  const info = await metaplex.rpc().getAccount(metadataAddress);
  const metadata = toMetadata(toMetadataAccount(info));

  return {
    asset: {
      token: { address: tokenAccount },
      address,
      creators: metadata.creators,
      metadataAddress,
    },
    sellerAddress,
    tradeStateAddress,
    price,
    tokens,
    auctionHouse,
    receiptAddress: undefined,
  };
}
