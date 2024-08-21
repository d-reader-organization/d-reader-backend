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
  token,
} from '@metaplex-foundation/js';
import {
  BuyInstructionAccounts,
  CancelInstructionAccounts,
  createBuyInstruction,
  createCancelBidReceiptInstruction,
  createCancelInstruction,
  createPrintBidReceiptInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import { createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import {
  ComputeBudgetProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { withdrawFromBuyerEscrow } from './withdrawFromBuyerEscrow';
import { solFromLamports } from '../../utils/helpers';
import { BidModel } from '../dto/types/bid-model';
import { BuyArgs } from '../dto/types/buy-args';
import { toListing } from './list';
import { constructExecuteSaleInstruction } from './executeSale';
import {
  AUCTION_HOUSE_LOOK_UP_TABLE,
  MIN_COMPUTE_PRICE_IX,
} from '../../constants';
import { ListingInput } from '../dto/listing.dto';

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

  const accounts: BuyInstructionAccounts = {
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
    tokenAccount,
  };

  const args = {
    tradeStateBump: buyerTradeState.bump,
    escrowPaymentBump: escrowPayment.bump,
    buyerPrice: price.basisPoints,
    tokenSize: tokens.basisPoints,
  };

  const instructions: TransactionInstruction[] = [];
  const buyInstruction = createBuyInstruction(accounts, args);

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

export async function constructInstantBuyTransaction(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  buyArguments: BuyArgs,
  listing: ListingInput,
) {
  const { mintAccount, buyer } = buyArguments;
  const price = Number(listing.price);
  const seller = new PublicKey(listing.feePayer);
  const bidInstruction = await constructPrivateBidInstruction(
    metaplex,
    auctionHouse,
    buyer,
    mintAccount,
    lamports(price),
    token(1),
    false,
    seller,
  );
  const partialListing = await toListing(metaplex, auctionHouse, listing);
  const bid = toBid(
    metaplex,
    auctionHouse,
    buyer,
    mintAccount,
    price,
    listing.symbol,
    seller,
  );
  const executeSaleInstruction = constructExecuteSaleInstruction(
    metaplex,
    auctionHouse,
    partialListing,
    bid,
  );
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const lookupTableAccount = await metaplex.connection.getAddressLookupTable(
    AUCTION_HOUSE_LOOK_UP_TABLE,
  );
  const instantBuyTransaction = new TransactionMessage({
    payerKey: buyer,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800000 }),
      MIN_COMPUTE_PRICE_IX,
      ...bidInstruction,
      executeSaleInstruction,
    ],
  }).compileToV0Message([lookupTableAccount.value]);
  const instantBuyTransactionV0 = new VersionedTransaction(
    instantBuyTransaction,
  );
  instantBuyTransactionV0.sign([metaplex.identity()]);

  const rawTransaction = Buffer.from(instantBuyTransactionV0.serialize());
  return rawTransaction.toString('base64');
}

export async function constructPrivateBidTransaction(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  buyer: PublicKey,
  mintAccount: PublicKey,
  price: number,
  printReceipt: boolean,
  seller?: PublicKey,
) {
  const bidInstruction = await constructPrivateBidInstruction(
    metaplex,
    auctionHouse,
    buyer,
    mintAccount,
    solFromLamports(price),
    token(1),
    printReceipt,
    seller,
  );
  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const bidTransaction = new Transaction({
    feePayer: buyer,
    ...latestBlockhash,
  }).add(...bidInstruction);

  const rawTransaction = bidTransaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return rawTransaction.toString('base64');
}

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

export async function constructCancelBidTransaction(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  bid: Bid,
) {
  const cancelBidInstruction = constructCancelBidInstruction(
    metaplex,
    bid,
    auctionHouse,
  );

  const latestBlockhash = await metaplex.connection.getLatestBlockhash();
  const bidTransaction = new Transaction({
    feePayer: bid.buyerAddress,
    ...latestBlockhash,
  }).add(...cancelBidInstruction);

  const rawTransaction = bidTransaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return rawTransaction.toString('base64');
}

export function toBid(
  metaplex: Metaplex,
  auctionHouse: AuctionHouse,
  buyerAddress: PublicKey,
  address: PublicKey,
  amount: number,
  symbol: string,
  seller: PublicKey,
): BidModel {
  const price = lamports(amount);
  const tokens = token(1, 0, symbol); // only considers nfts
  const tokenAccount = metaplex.tokens().pdas().associatedTokenAccount({
    mint: address,
    owner: seller,
  });

  const tradeStateAddress = metaplex.auctionHouse().pdas().tradeState({
    auctionHouse: auctionHouse.address,
    wallet: buyerAddress,
    treasuryMint: auctionHouse.treasuryMint.address,
    tokenMint: address,
    price: price.basisPoints,
    tokenSize: tokens.basisPoints,
    tokenAccount,
  });
  return {
    asset: {
      token: { address: tokenAccount },
      address,
    },
    buyerAddress,
    tradeStateAddress,
    price,
    tokens,
    auctionHouse,
  };
}
