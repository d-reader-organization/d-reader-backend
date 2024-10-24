import { PublicKey } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';
import { SOL_ADDRESS } from '../constants';

@QuestionSet({ name: 'update-cm-group-price' })
export class UpdateCMGroupPriceQuestions {
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
    name: 'price',
    message: 'Enter the new price for candymachine group',
  })
  parsePrice(price: string): number {
    return Number(price);
  }

  @Question({
    type: 'input',
    name: 'splTokenAddress',
    default: undefined,
    message: 'Enter the token address of the currency',
  })
  parseEndDate(splTokenAddress?: string): string {
    if (splTokenAddress) return splTokenAddress;
    return SOL_ADDRESS;
  }
}
