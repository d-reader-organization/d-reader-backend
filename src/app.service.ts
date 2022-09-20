import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  get(): string {
    return 'API connected successfully!';
  }

  getAuth(address: string): string {
    return `API connected successfully! Welcome ${address}`;
  }
}
