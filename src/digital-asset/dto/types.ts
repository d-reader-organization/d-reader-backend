export interface DigitalAssetJsonMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  isNSFW?: boolean;
  tags?: string[];
  genres?: string[];
  attributes?: Array<{
    trait_type?: string;
    value?: string;
    [key: string]: unknown;
  }>;
  properties?: {
    creators?: Array<{
      address?: string;
      percentage?: number;
      [key: string]: unknown;
    }>;
    files?: Array<{
      type?: string;
      uri?: string;
      name?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  collection?: {
    name?: string;
    family?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export enum AttributeEnum {
  SIGNED = 'signed',
  USED = 'used',
  RARITY = 'rarity',
  NUMBER = 'number',
}
