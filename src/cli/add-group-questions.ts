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
    name: 'displayLabel',
    message: 'display label for the group',
    validate: async function (value: string) {
      if (!value) return 'invalid display label';
      return true;
    },
  })
  parseDisplayLabel(label: string): string {
    return label;
  }

  @Question({
    type: 'input',
    name: 'supply',
    message: 'supply of mint for the group',
  })
  parseSupply(supply: number): number {
    if (typeof supply === 'string') return +supply;
    return supply;
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

  @Question({
    type: 'input',
    name: 'startDate',
    message: 'Enter the start date and time (YYYY-MM-DDTH:M:S) in UTC',
  })
  parseStartDate(startDate?: string): Date | undefined {
    if (startDate) return new Date(startDate);
  }

  @Question({
    type: 'input',
    name: 'endDate',
    message: 'Enter the end date and time (YYYY-MM-DDTH:M:S) in UTC',
  })
  parseEndDate(endDate?: string): Date | undefined {
    if (endDate) return new Date(endDate);
  }

  @Question({
    type: 'input',
    name: 'mintLimit',
    message: 'Allotted Minting Limit per Wallet',
  })
  parseMintLimit(mintLimit?: number): number | undefined {
    if (!mintLimit) return;
    if (typeof mintLimit === 'string') return +mintLimit;
    return mintLimit;
  }

  @Question({
    type: 'confirm',
    name: 'frozen',
    message: 'Do you want the minted nfts from this group to be frozen',
  })
  parseFrozen(frozen: string): boolean {
    return frozen.toLowerCase() === 'yes';
  }
}
