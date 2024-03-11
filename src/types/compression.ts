export type TreeConfigData = {
  canopyDepth: number;
  maxBufferSize: number;
  maxDepth: number;
};

type HeliusEventCreator = {
  address: string;
  share: number;
  verified: boolean;
};

export type HeliusCompressedNftMetadata = {
  collection: {
    key: string;
    verified: boolean;
  };
  creators: HeliusEventCreator[];
  isMutable: boolean;
  name: string;
  primarySaleHappened: boolean;
  sellerFeeBasisPoints: number;
  symbol: string;
  tokenProgramVersion: string;
  tokenStandard: string;
  uri: string;
};

export type HeliusCompressedNftUpdateArgs = {
  name?: string;
  uri?: string;
};
