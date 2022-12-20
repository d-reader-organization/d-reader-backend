import {
  Metaplex,
  guestIdentity,
  mockStorage,
  keypairIdentity,
  KeypairSigner,
  CreateNftInput,
  UploadMetadataInput,
  CreateSftInput,
  sol,
} from '@metaplex-foundation/js';
import { Commitment, Connection, Keypair } from '@solana/web3.js';

export type MetaplexTestOptions = {
  rpcEndpoint?: string;
  commitment?: Commitment;
  solsToAirdrop?: number;
};

export const metaplexGuest = (options: MetaplexTestOptions = {}) => {
  const connection = new Connection(
    options.rpcEndpoint ?? process.env.SOLANA_RPC_NODE_ENDPOINT,
    options.commitment ?? 'confirmed',
  );

  return Metaplex.make(connection).use(guestIdentity()).use(mockStorage());
};

export const metaplex = async (options: MetaplexTestOptions = {}) => {
  const mx = metaplexGuest(options);
  const wallet = await createWallet(mx, options.solsToAirdrop);

  return mx.use(keypairIdentity(wallet as Keypair));
};

export const createWallet = async (
  mx: Metaplex,
  solsToAirdrop = 2,
): Promise<KeypairSigner> => {
  const wallet = Keypair.generate();
  await mx.rpc().airdrop(wallet.publicKey, sol(solsToAirdrop));

  return wallet;
};

export const createNft = async (
  mx: Metaplex,
  input: Partial<CreateNftInput & { json: UploadMetadataInput }> = {},
) => {
  const { uri } = await mx.nfts().uploadMetadata(input.json ?? {});
  const { nft } = await mx.nfts().create({
    uri,
    name: 'My NFT',
    sellerFeeBasisPoints: 200,
    ...input,
  });

  return nft;
};

export const createCollectionNft = (
  mx: Metaplex,
  input: Partial<CreateNftInput & { json: UploadMetadataInput }> = {},
) => createNft(mx, { ...input, isCollection: true });

export const createSft = async (
  mx: Metaplex,
  input: Partial<CreateSftInput & { json: UploadMetadataInput }> = {},
) => {
  const { uri } = await mx.nfts().uploadMetadata(input.json ?? {});
  const { sft } = await mx.nfts().createSft({
    uri,
    name: 'My SFT',
    sellerFeeBasisPoints: 200,
    ...input,
  });

  return sft;
};
