import { Config } from './config.interface';

const config: Config = {
  nest: {
    port: 3005,
  },
  cors: {
    enabled: true,
  },
  swagger: {
    enabled: true,
    title: 'dReader API',
    description: 'API endpoints for dReader.io app',
    version: '0.1.0',
    path: 'api',
    persistAuthorization: true,
  },
  security: {
    expiresIn: '7d',
    refreshIn: '30d',
    bcryptSaltOrRound: 10,
  },
  s3: {
    region: 'us-east-1',
  },
  throttle: {
    ttl: 30,
    limit: 15,
    ignoreUserAgents: [],
  },
};

export default (): Config => config;
