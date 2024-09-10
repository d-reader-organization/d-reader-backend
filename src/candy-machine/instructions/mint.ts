import { PublicKey } from '@solana/web3.js';
import {
  ALLOW_LIST_PROOF_COMPUTE_PRICE,
  ALLOW_LIST_PROOF_COMPUTE_UNITS,
} from '../../constants';
import {
  createNoopSigner,
  generateSigner,
  some,
  transactionBuilder,
  Umi,
  PublicKey as UmiPublicKey,
  AddressLookupTableInput,
  publicKey,
  none,
} from '@metaplex-foundation/umi';
import {
  CandyMachine as CoreCandyMachine,
  fetchCandyGuard,
  DefaultGuardSetMintArgs,
  DefaultGuardSet,
  getMerkleRoot,
  route,
  getMerkleProof,
  fetchCandyMachine,
  mintV1 as CoreMintV1,
} from '@metaplex-foundation/mpl-core-candy-machine';
import {
  fetchAddressLookupTable,
  setComputeUnitLimit,
  setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox';
import { getThirdPartyUmiSignature } from '../../utils/metaplex';
import { encodeUmiTransaction } from '../../utils/transactions';

export const METAPLEX_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

export async function constructCoreMintTransaction(
  umi: Umi,
  candyMachineAddress: UmiPublicKey,
  minter: UmiPublicKey,
  label: string,
  allowList?: string[],
  lookupTableAddress?: string,
  thirdPartySign?: boolean,
  computePrice?: number,
) {
  try {
    const transactions: string[] = [];
    const asset = generateSigner(umi);
    const signer = createNoopSigner(minter);

    const isPriorityFeeCalculated = !!computePrice;

    const candyMachine = await fetchCandyMachine(umi, candyMachineAddress);
    if (allowList) {
      const allowListTransaction = await transactionBuilder()
        .add(
          setComputeUnitLimit(umi, { units: ALLOW_LIST_PROOF_COMPUTE_UNITS }),
        )
        .add(
          setComputeUnitPrice(umi, {
            microLamports: ALLOW_LIST_PROOF_COMPUTE_PRICE,
          }),
        )
        .add(
          route(umi, {
            candyMachine: candyMachine.publicKey,
            guard: 'allowList',
            routeArgs: {
              path: 'proof',
              merkleRoot: getMerkleRoot(allowList),
              merkleProof: getMerkleProof(allowList, minter),
            },
            payer: signer,
            group: label ?? none(),
          }),
        )
        .buildAndSign({ ...umi, payer: signer });
      const encodedTransaction = encodeUmiTransaction(
        allowListTransaction,
        'base64',
      );
      transactions.push(encodedTransaction);
    }

    let lookupTable: AddressLookupTableInput;
    if (lookupTableAddress) {
      lookupTable = await fetchAddressLookupTable(
        umi,
        publicKey(lookupTableAddress),
        { commitment: 'confirmed' },
      );
    }
    const mintArgs = await getMintArgs(umi, candyMachine, label);

    const CORE_MINT_COMPUTE_UNITS = 160000;
    let builder = transactionBuilder().add(
      setComputeUnitLimit(umi, {
        units: CORE_MINT_COMPUTE_UNITS,
      }),
    );
    if (isPriorityFeeCalculated) {
      builder = builder.add(
        setComputeUnitPrice(umi, {
          microLamports: computePrice,
        }),
      );
    }

    let transaction = await builder
      .add(
        CoreMintV1(umi, {
          candyMachine: candyMachine.publicKey,
          minter: signer,
          collection: candyMachine.collectionMint,
          asset,
          group: some(label),
          payer: signer,
          mintArgs,
        }),
      )
      .setAddressLookupTables(lookupTable ? [lookupTable] : [])
      .buildAndSign({ ...umi, payer: signer });

    if (thirdPartySign) {
      transaction = await getThirdPartyUmiSignature(transaction);
    }

    const encodedMintTransaction = encodeUmiTransaction(transaction, 'base64');
    transactions.push(encodedMintTransaction);

    return transactions;
  } catch (e) {
    console.error(`Error constructing mint transaction ${e}`);
  }
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
