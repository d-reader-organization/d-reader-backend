export type TENSOR_LISTING_RESPONSE = {
  mint: string;
  listing: {
    price: string;
    txId: string;
    txAt: string;
    seller: string;
    source: string;
  };
};
