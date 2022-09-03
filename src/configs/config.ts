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
    title: 'Gorecats Comic Reader API',
    description: 'API endpoints for comic.gorecats.io app',
    version: '0.1.0',
    path: 'api',
    persistAuthorization: true,
  },
  security: {
    expiresIn: '1d',
    refreshIn: '7d',
    bcryptSaltOrRound: 10,
  },
};

export default (): Config => config;
