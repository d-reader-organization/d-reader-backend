export type IndexedNft = {
  owner: {
    userId: number;
  };
  collectionNft?: {
    comicIssueId: number;
  };
} & {
  address: string;
  uri: string;
  name: string;
  ownerAddress: string;
  ownerChangedAt: Date;
  candyMachineAddress: string;
  collectionNftAddress: string;
};
