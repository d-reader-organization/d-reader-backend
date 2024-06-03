import { BadRequestException } from '@nestjs/common';
import { maxLength, minLength, isEmail } from 'class-validator';
import { USERNAME_MAX_SIZE, USERNAME_MIN_SIZE } from '../constants';
import { isValidUsername } from '../decorators/IsValidUsername';
import { naughtyWords } from './naughty-words';
import { User, Wallet } from '@prisma/client';

export function validateName(name: string) {
  if (typeof name !== 'string') {
    throw new BadRequestException(`Bad name format: ${name || '<unknown>'}`);
  } else if (!maxLength(name, USERNAME_MAX_SIZE)) {
    throw new BadRequestException(`Max ${USERNAME_MAX_SIZE} characters`);
  } else if (!minLength(name, USERNAME_MIN_SIZE)) {
    throw new BadRequestException(`Min ${USERNAME_MIN_SIZE} characters`);
  } else if (!isValidUsername(name)) {
    throw new BadRequestException('Only have A-Z,0-9,_,- characters allowed');
  } else if (naughtyWords.includes(name.toLowerCase())) {
    throw new BadRequestException(
      'Naughty word detected. Please use another username or contact us if you think this is a mistake',
    );
  }
}

export function validateCreatorName(name: string) {
  if (typeof name !== 'string') {
    throw new BadRequestException(`Bad name format: ${name || '<unknown>'}`);
  } else if (!maxLength(name, USERNAME_MAX_SIZE)) {
    throw new BadRequestException(`Max ${USERNAME_MAX_SIZE} characters`);
  } else if (!minLength(name, USERNAME_MIN_SIZE)) {
    throw new BadRequestException(`Min ${USERNAME_MIN_SIZE} characters`);
  }
}

export function validateEmail(email: string) {
  if (typeof email !== 'string') {
    throw new BadRequestException(`Bad email format: ${email || '<unknown>'}`);
  } else if (!isEmail(email)) {
    throw new BadRequestException('Incorrect email format');
  }
}

export function hasCompletedSetup(user: User & { wallets: Wallet[] }) {
  return user.emailVerifiedAt && user.wallets.length;
}
