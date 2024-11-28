import { parentPort } from 'worker_threads';
import { verifySignature } from '../../utils/transactions';

parentPort.on('message', async (task) => {
  try {
    const isVerified = verifySignature(
      task.messageBytes,
      task.signatures,
      task.publicKey,
    );
    console.log('results:', isVerified);
    parentPort.postMessage({ success: true, data: isVerified });
  } catch (error: any) {
    parentPort.postMessage({ success: false, data: error.message });
  }
});
