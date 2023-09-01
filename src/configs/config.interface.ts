import { AwsCredentialIdentity } from '@aws-sdk/types';

export interface Config {
  client: ClientConfig;
  nest: NestConfig;
  cors: CorsConfig;
  swagger: SwaggerConfig;
  security: SecurityConfig;
  s3: S3Config;
  throttle: ThrottleConfig;
}

export interface ClientConfig {
  dReaderUrl: string;
  dPublisherUrl: string;
}

export interface NestConfig {
  port: number;
  apiUrl: string;
}

export interface CorsConfig {
  enabled: boolean;
}

export interface SwaggerConfig {
  enabled: boolean;
  title: string;
  description: string;
  version: string;
  path: string;
  persistAuthorization: boolean;
}

export interface SecurityConfig {
  expiresIn: string;
  refreshIn: string;
  bcryptSaltOrRound: string | number;
}

export interface S3Config {
  region: string;
  bucket: string;
  cdn?: string;
  credentials: AwsCredentialIdentity;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
  ignoreUserAgents: RegExp[];
}
