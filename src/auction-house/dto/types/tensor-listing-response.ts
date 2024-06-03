export type TENSOR_LISTING_RESPONSE = {
  mint: {
    onchainId: string;
  };
  tx: {
    sellerId: string;
    grossAmount: string;
    grossAmountUnit: string;
    source: string;
    txId: string;
  };
};
