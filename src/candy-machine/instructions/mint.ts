import {
  createNoopSigner,
  generateSigner,
  some,
  transactionBuilder,
  PublicKey as UmiPublicKey,
  AddressLookupTableInput,
  publicKey,
  BlockhashWithExpiryBlockHeight,
} from '@metaplex-foundation/umi';
import {
  DefaultGuardSetMintArgs,
  DefaultGuardSet,
  mintV1 as CoreMintV1,
  CandyGuardAccountData,
} from '@metaplex-foundation/mpl-core-candy-machine';
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import {
  getAuthorizationSignerUmiPublicKey,
  getAuthorizationSignerUmiSignature,
  getIdentityUmiSignature,
  getTreasuryPublicKey,
  umi,
} from '../../utils/metaplex';
import { encodeUmiTransaction } from '../../utils/transactions';
import { BadRequestException } from '@nestjs/common';

export async function constructMultipleMintTransaction(
  candyMachineAddress: UmiPublicKey,
  collectionAddress: UmiPublicKey,
  candyGuard: CandyGuardAccountData<DefaultGuardSet>,
  minter: UmiPublicKey,
  label: string,
  numberOfItems: number,
  blockHash: BlockhashWithExpiryBlockHeight,
  lookupTable?: AddressLookupTableInput,
  isSponsored = false,
): Promise<string> {
  try {
    const mintArgs = getMintArgs(candyMachineAddress, candyGuard, label);

    const mintTransaction = await getAuthorizedMintTransaction(
      candyMachineAddress,
      collectionAddress,
      minter,
      numberOfItems,
      label,
      mintArgs,
      blockHash,
      lookupTable,
      isSponsored,
    );

    const encodedMintTransaction = encodeUmiTransaction(
      mintTransaction,
      'base64',
    );

    return encodedMintTransaction;
  } catch (e) {
    console.error('Error construction mint transaction', e);
  }
}

async function getAuthorizedMintTransaction(
  candyMachine: UmiPublicKey,
  collection: UmiPublicKey,
  minter: UmiPublicKey,
  numberOfItems: number,
  label: string,
  mintArgs: Partial<DefaultGuardSetMintArgs>,
  blockHash: BlockhashWithExpiryBlockHeight,
  lookupTable?: AddressLookupTableInput,
  isSponsored = false,
) {
  const identityPublicKey = getTreasuryPublicKey();
  const authorizationSigner = getAuthorizationSignerUmiPublicKey();
  const signer = createNoopSigner(minter);
  const CORE_MINT_COMPUTE_UNITS = 160000;

  const payer = isSponsored
    ? createNoopSigner(publicKey(identityPublicKey))
    : signer;

  let builder = transactionBuilder().add(
    setComputeUnitLimit(umi, {
      units: CORE_MINT_COMPUTE_UNITS * numberOfItems,
    }),
  );

  for (let i = 0; i < numberOfItems; i++) {
    const asset = generateSigner(umi);
    builder = builder.add(
      CoreMintV1(umi, {
        candyMachine,
        minter: signer,
        collection,
        asset,
        group: some(label),
        payer,
        mintArgs,
      }),
    );
  }

  const transaction = await builder
    .setBlockhash(blockHash)
    .addRemainingAccounts({
      pubkey: authorizationSigner,
      isSigner: true,
      isWritable: false,
    })
    .setAddressLookupTables(lookupTable ? [lookupTable] : [])
    .buildAndSign({ ...umi, payer });

  const authorizedTransaction = await getAuthorizationSignerUmiSignature(
    transaction,
  );
  return isSponsored
    ? getIdentityUmiSignature(authorizedTransaction)
    : authorizedTransaction;
}

function getMintArgs(
  candyMachineAddress: UmiPublicKey,
  candyGuard: CandyGuardAccountData<DefaultGuardSet>,
  label: string,
) {
  const defaultGuards = candyGuard.guards;
  const group = candyGuard.groups.find((group) => group.label == label);

  if (!group) {
    throw new BadRequestException(`label ${label} does not exist`);
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
