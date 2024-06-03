export type TENSOR_ASSET = {
  onchainId: string;
  owner: string;
  listing: { seller: string; price: number; txId: string; source: string };
};
