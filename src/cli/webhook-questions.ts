import { Connection } from '@solana/web3.js';
import { isURL } from 'class-validator';
import { QuestionSet, Question } from 'nest-commander';
import { heliusClusterApiUrl } from 'helius-sdk';

@QuestionSet({ name: 'webhook' })
export class WebhookQuestions {
  @Question({
    type: 'input',
    name: 'webhookURL',
    default: '',
    message: 'Desired Webhook URL (empty to skip changes)',
    validate: async function (value: string) {
      const heliusApiKey = process.env.HELIUS_API_KEY;
      if (!heliusApiKey) {
        return 'Helius API key missing';
      }

      // if webhook id is not specified it means we're creating a new webhook
      // when creating a new webhook we need webhookURL to be a valid URL
      if (
        (!process.env.WEBHOOK_ID ||
          process.env.WEBHOOK_ID === 'REPLACE_THIS') &&
        !value
      ) {
        return 'WebhookURL must be specified when creating a new webhook';
      }

      if (value && !isURL(value)) {
        return 'WebhookURL must be a valid URL';
      }

      const endpoint = heliusClusterApiUrl(heliusApiKey, 'devnet');
      const connection = new Connection(endpoint, 'confirmed');

      try {
        // Fire a dummy request with the Helius RPC endpoint and API key
        await connection.getVersion();
      } catch {
        return 'Invalid Helius API key';
      }

      return true;
    },
  })
  parseWebhookURL(webhookURL: string): string {
    return webhookURL;
  }
}
