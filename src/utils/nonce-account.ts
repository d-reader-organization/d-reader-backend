import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

export async function createNonceAccount(
  connection: Connection,
  identity: Keypair,
) {
  const nonceKey = Keypair.generate();
  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({
    ...latestBlockhash,
    feePayer: identity.publicKey,
  });
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: identity.publicKey,
      newAccountPubkey: nonceKey.publicKey,
      lamports: 0.0015 * LAMPORTS_PER_SOL,
      space: NONCE_ACCOUNT_LENGTH,
      programId: SystemProgram.programId,
    }),
    SystemProgram.nonceInitialize({
      noncePubkey: nonceKey.publicKey,
      authorizedPubkey: identity.publicKey,
    }),
  );
  await sendAndConfirmTransaction(connection, tx, [nonceKey, identity]);
  const nonceInfo = await connection.getAccountInfo(nonceKey.publicKey);
  const nonceAccount = NonceAccount.fromAccountData(nonceInfo.data);

  return { nonce: nonceAccount.nonce, pubkey: nonceKey.publicKey };
}
