import axios from 'axios';

export const BASE_URL = 'https://workers.dreader.io';

export type ConstructMintTransactionRequestParams = {
  candyMachineAddress: string;
  collectionAddress: string;
  candyGuardBufferString: string;
  minter: string;
  label: string;
  numberOfItems: number;
  lookupTableAddress?: string;
  lookupTableBufferString?: string;
  isSponsored?: boolean;
};

export async function constructMintTransactionOnWorker(
  data: ConstructMintTransactionRequestParams,
) {
  const response = await axios.post<string>(
    `${BASE_URL}/construct-mint`,
    data,
    {
      headers: {
        'api-key': `${process.env.WORKER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data;
}
