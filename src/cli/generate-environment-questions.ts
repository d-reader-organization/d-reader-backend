import { Connection } from '@solana/web3.js';
import { QuestionSet, Question } from 'nest-commander';
import { heliusClusterApiUrl } from 'helius-sdk';

@QuestionSet({ name: 'generate-environment' })
export class GenerateEnvironmentQuestions {
  @Question({
    type: 'list',
    name: 'cluster',
    choices: [
      {
        value: 'devnet',
        checked: true,
      },
      {
        value: 'mainnet-beta',
      },
    ],
    default: 'devnet',
    message: `Which cluster do you wish to use?`,
    validate: function (value: string) {
      if (value === 'devnet' || value === 'mainnet-beta') {
        return true;
      }
      return "Please enter either 'devnet' or 'mainnet-beta'";
    },
  })
  parseCluster(cluster: string): string {
    return cluster || 'devnet';
  }

  @Question({
    type: 'input',
    name: 'heliusApiKey',
    default: process.env.HELIUS_API_KEY,
    message: "What's your Helius API key? (empty if already present)",
    validate: async function (value: string) {
      if (!value && !process.env.HELIUS_API_KEY) {
        return 'Helius API key missing';
      }

      const endpoint = heliusClusterApiUrl(value, 'devnet');
      const connection = new Connection(endpoint, 'confirmed');

      try {
        // Fire a dummy request with the Helius RPC endpoint and API key
        await connection.getVersion();
        return true;
      } catch {
        return 'Invalid Helius API key';
      }
    },
  })
  parseHeliusApiKey(heliusApiKey: string): string {
    return heliusApiKey || process.env.HELIUS_API_KEY;
  }
}
