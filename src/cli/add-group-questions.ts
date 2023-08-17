import { DateTime, toDateTime } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';

@QuestionSet({ name: 'add-group' })
export class AddGroupQuestions {
  @Question({
    type: 'input',
    name: 'candyMachineAddress',
    message: 'address of candymachine to update',
    validate: async function (value: string) {
      if (value && !PublicKey.isOnCurve(value)) {
        return 'Address must be a solana address';
      }
      return true;
    },
  })
  parseCandyMachineAddress(candy_machine: string): string {
    return candy_machine;
  }

  @Question({
    type: 'input',
    name: 'label',
    message: 'group label must be of max 6 characters',
    validate: async function (value: string) {
      if (!value || value.length > 6 || value.length < 1)
        return 'invalid group label';
      return true;
    },
  })
  parseLabel(label: string): string {
    return label;
  }

  @Question({
    type: 'input',
    name: 'startDate',
    message: 'Enter the start date and time (YYYY-MM-DDTH:M:S) in UTC',
  })
  parseStartDate(startDate: string): DateTime {
    return toDateTime(startDate);
  }

  @Question({
    type: 'input',
    name: 'endDate',
    message: 'Enter the end date and time (YYYY-MM-DDTH:M:S) in UTC',
  })
  parseEndDate(endDate: string): DateTime {
    return toDateTime(endDate);
  }

  @Question({
    type: 'input',
    name: 'mintLimit',
    message: 'Allotted Minting Limit per Wallet',
  })
  parseMintLimit(mintLimit: number): number {
    if (typeof mintLimit === 'string') return +mintLimit;
    return mintLimit;
  }

  @Question({
    type: 'input',
    name: 'mintPrice',
    message: 'price of the nft (in lamports)',
  })
  parseMintPrice(amount: number): number {
    if (typeof amount === 'string') return +amount;
    return amount;
  }
}
