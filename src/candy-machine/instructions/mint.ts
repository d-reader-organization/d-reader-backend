import { PublicKey, Transaction } from '@solana/web3.js';
import {
  createNoopSigner,
  generateSigner,
  some,
  transactionBuilder,
  Umi,
  PublicKey as UmiPublicKey,
  AddressLookupTableInput,
  publicKey,
  KeypairSigner,
} from '@metaplex-foundation/umi';
import {
  CandyMachine as CoreCandyMachine,
  fetchCandyGuard,
  DefaultGuardSetMintArgs,
  DefaultGuardSet,
  fetchCandyMachine,
  mintV1 as CoreMintV1,
} from '@metaplex-foundation/mpl-core-candy-machine';
import {
  fetchAddressLookupTable,
  setComputeUnitLimit,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import {
  getThirdPartyLegacySignature,
  getThirdPartySigner,
} from '../../utils/metaplex';
import { encodeUmiTransaction } from '../../utils/transactions';
import { createMemoInstruction } from '@solana/spl-memo';
import { toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';

export async function constructMultipleMintTransaction(
  umi: Umi,
  candyMachineAddress: UmiPublicKey,
  minter: UmiPublicKey,
  label: string,
  numberOfItems: number,
  lookupTableAddress?: string,
  computePrice?: number,
): Promise<string[]> {
  try {
    const transactions: string[] = [];
    const lookupTable = await fetchLookupTable(umi, lookupTableAddress);
    const candyMachine = await fetchCandyMachine(umi, candyMachineAddress);
    const signer = createNoopSigner(minter);
    const mintArgs = await getMintArgs(umi, candyMachine, label);

    const builder = createTransactionBuilder(umi, numberOfItems, computePrice);
    const { assetSigners, builder: mintBuilder } =
      addMintBuildersAndGenerateSigners(
        umi,
        numberOfItems,
        builder,
        candyMachine,
        signer,
        label,
        mintArgs,
      );

    const mintTransaction = await buildAndSignTransaction(
      mintBuilder,
      umi,
      signer,
      lookupTable,
    );

    const authorizationTx = await createAuthorizationTransaction(
      umi,
      minter,
      assetSigners,
    );
    transactions.push(authorizationTx);

    const encodedMintTransaction = encodeUmiTransaction(
      mintTransaction,
      'base64',
    );
    transactions.push(encodedMintTransaction);

    return transactions;
  } catch (e) {
    console.error('Error construction mint transaction', e);
  }
}

async function fetchLookupTable(
  umi: Umi,
  address?: string,
): Promise<AddressLookupTableInput | undefined> {
  if (!address) return undefined;
  return fetchAddressLookupTable(umi, publicKey(address), {
    commitment: 'confirmed',
  });
}

function createTransactionBuilder(
  umi: Umi,
  numberOfItems: number,
  computePrice?: number,
): ReturnType<typeof transactionBuilder> {
  const CORE_MINT_COMPUTE_UNITS = 160000;
  let builder = transactionBuilder().add(
    setComputeUnitLimit(umi, {
      units: CORE_MINT_COMPUTE_UNITS * numberOfItems,
    }),
  );

  if (computePrice) {
    builder = builder.add(
      setComputeUnitPrice(umi, { microLamports: computePrice }),
    );
  }

  return builder;
}

function addMintBuildersAndGenerateSigners(
  umi: Umi,
  numberOfItems: number,
  builder: ReturnType<typeof transactionBuilder>,
  candyMachine: CoreCandyMachine,
  signer: ReturnType<typeof createNoopSigner>,
  label: string,
  mintArgs: Awaited<ReturnType<typeof getMintArgs>>,
): {
  assetSigners: KeypairSigner[];
  builder: ReturnType<typeof transactionBuilder>;
} {
  const assetSigners: KeypairSigner[] = [];

  for (let i = 0; i < numberOfItems; i++) {
    const asset = generateSigner(umi);
    assetSigners.push(asset);

    builder = builder.add(
      CoreMintV1(umi, {
        candyMachine: candyMachine.publicKey,
        minter: signer,
        collection: candyMachine.collectionMint,
        asset,
        group: some(label),
        payer: signer,
        mintArgs,
      }),
    );
  }

  return { assetSigners, builder };
}

async function buildAndSignTransaction(
  builder: ReturnType<typeof transactionBuilder>,
  umi: Umi,
  signer: ReturnType<typeof createNoopSigner>,
  lookupTable?: AddressLookupTableInput,
) {
  return builder
    .setAddressLookupTables(lookupTable ? [lookupTable] : [])
    .buildAndSign({ ...umi, payer: signer });
}

async function createAuthorizationTransaction(
  umi: Umi,
  minter: UmiPublicKey,
  assetSigners: KeypairSigner[],
): Promise<string> {
  const thirdPartySigner = getThirdPartySigner();
  const minterPublicKey = new PublicKey(minter.toString());

  const authorizationMemo = createMemoInstruction('Authorized Mint!', [
    thirdPartySigner,
    minterPublicKey,
    ...assetSigners.map((signer) => new PublicKey(signer.publicKey)),
  ]);

  const latestBlockHash = await umi.rpc.getLatestBlockhash({
    commitment: 'confirmed',
  });
  const memoTx = new Transaction({
    feePayer: minterPublicKey,
    ...latestBlockHash,
  }).add(authorizationMemo);
  const signedMemoTx = getThirdPartyLegacySignature(memoTx);
  signedMemoTx.partialSign(
    ...assetSigners.map((signer) => toWeb3JsKeypair(signer)),
  );

  return signedMemoTx
    .serialize({ requireAllSignatures: false })
    .toString('base64');
}

async function getMintArgs(
  umi: Umi,
  candyMachine: CoreCandyMachine,
  label: string,
) {
  const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority);
  const defaultGuards = candyGuard.guards;
  const group = candyGuard.groups.find((group) => group.label == label);

  if (!group) {
    throw new Error(
      `Group with label ${label} does not exist on Candy Machine ${candyMachine.publicKey.toString()}`,
    );
  }

  // remove null to overwrite default guards with only specified guards in group
  const activeGroupGuards = Object.fromEntries(
    Object.entries(group.guards).filter(([, v]) => v.__option == 'Some'),
  ) as Partial<DefaultGuardSet>;

  const resolvedGuards = { ...defaultGuards, ...activeGroupGuards };
  const availableGuards = Object.entries(resolvedGuards).map(
    (guard) => guard[0],
  );

  const mintArgsEntries = availableGuards
    .map((guard) => {
      if (resolvedGuards[guard].__option == 'Some') {
        switch (guard) {
          case 'thirdPartySigner':
            if (resolvedGuards.thirdPartySigner.__option == 'Some') {
              const signer = createNoopSigner(
                resolvedGuards.thirdPartySigner.value.signerKey,
              );
              return [guard, some({ signer })];
            }
            break;
          case 'allowList':
            if (resolvedGuards.allowList.__option == 'Some') {
              return [
                guard,
                some({ merkleRoot: resolvedGuards.allowList.value.merkleRoot }),
              ];
            }
            break;
          case 'freezeSolPayment':
            if (resolvedGuards.freezeSolPayment.__option == 'Some') {
              return [
                guard,
                some({
                  lamports: resolvedGuards.freezeSolPayment.value.lamports,
                  destination:
                    resolvedGuards.freezeSolPayment.value.destination,
                }),
              ];
            }
            break;

          case 'mintLimit':
            if (resolvedGuards.mintLimit.__option == 'Some') {
              return [guard, some({ id: resolvedGuards.mintLimit.value.id })];
            }
            break;

          case 'redeemedAmount':
            if (resolvedGuards.redeemedAmount.__option == 'Some') {
              return [
                guard,
                some({
                  maximum: Number(resolvedGuards.redeemedAmount.value.maximum),
                }),
              ];
            }
            break;
          case 'solPayment':
            if (resolvedGuards.solPayment.__option == 'Some') {
              return [
                guard,
                some({
                  lamports: resolvedGuards.solPayment.value.lamports,
                  destination: resolvedGuards.solPayment.value.destination,
                }),
              ];
            }
            break;
          case 'tokenPayment':
            if (resolvedGuards.tokenPayment.__option == 'Some') {
              return [
                guard,
                some({
                  mint: resolvedGuards.tokenPayment.value.mint,
                  destinationAta:
                    resolvedGuards.tokenPayment.value.destinationAta,
                }),
              ];
            }
            break;
          case 'freezeTokenPayment':
            if (resolvedGuards.freezeTokenPayment.__option == 'Some') {
              return [
                guard,
                some({
                  mint: publicKey(resolvedGuards.freezeTokenPayment.value.mint),
                  destinationAta: publicKey(
                    resolvedGuards.freezeTokenPayment.value.destinationAta,
                  ),
                }),
              ];
            }
            break;
        }
      }
    })
    .filter(Boolean);

  const mintArgs: Partial<DefaultGuardSetMintArgs> =
    Object.fromEntries(mintArgsEntries);

  return mintArgs;
}
