export const getApiUrl = (environment: string) =>
  environment === 'dev'
    ? 'https://api.dev.dreader.io'
    : 'https://api.dreader.io';
