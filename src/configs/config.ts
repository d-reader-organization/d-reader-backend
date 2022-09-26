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
    expiresIn: '1d',
    refreshIn: '7d',
    bcryptSaltOrRound: 10,
  },
  s3: {
    bucket: 'd-reader',
    region: 'us-east-1',
  },
};

export default (): Config => config;
