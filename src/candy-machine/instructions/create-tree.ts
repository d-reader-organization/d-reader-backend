import { createTree } from '@metaplex-foundation/mpl-bubblegum';
import {
  Umi,
  generateSigner,
  PublicKey as UmiPublicKey,
} from '@metaplex-foundation/umi';
import { getTreeConfig } from '../../utils/compression';

export async function createTreeTransaction(
  umi: Umi,
  supply: number,
): Promise<UmiPublicKey> {
  const merkleTree = generateSigner(umi);
  const { maxDepth, maxBufferSize, canopyDepth } = getTreeConfig(supply);
  const transactionBuilder = await createTree(umi, {
    merkleTree,
    maxDepth,
    maxBufferSize,
    canopyDepth,
    public: false,
  });
  const transaction = await transactionBuilder.buildAndSign(umi);
  const signature = await umi.rpc.sendTransaction(transaction, {
    commitment: 'confirmed',
  });
  const latestBlockhash = await umi.rpc.getLatestBlockhash({
    commitment: 'confirmed',
  });
  await umi.rpc.confirmTransaction(signature, {
    commitment: 'confirmed',
    strategy: { ...latestBlockhash, type: 'blockhash' },
  });
  return merkleTree.publicKey;
}
