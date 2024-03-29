import { Config } from './config.interface';

const config: Config = {
  client: {
    dReaderUrl: process.env.D_READER_URL,
    dPublisherUrl: process.env.D_PUBLISHER_URL,
  },
  nest: {
    port: 3005,
    apiUrl: process.env.API_URL,
  },
  cors: {
    enabled: true,
  },
  swagger: {
    enabled: true,
    title: 'dReader API',
    description: 'API endpoints for dReader.io app',
    version: '1.0.0',
    path: 'api',
    persistAuthorization: true,
  },
  security: {
    expiresIn: '30d',
    refreshIn: '90d',
    bcryptSaltOrRound: 10,
  },
  s3: {
    region: process.env.AWS_BUCKET_REGION,
    bucket: process.env.AWS_BUCKET_NAME,
    cdn: process.env.CDN_URL,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },
  googleAuth: {
    clientId: process.env.GOOGLE_AUTH_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET ?? '',
  },
  throttle: {
    ttl: 3,
    limit: 18000000000,
    ignoreUserAgents: [],
  },
};

export default (): Config => config;
