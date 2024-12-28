import { BadRequestException } from '@nestjs/common';
import { maxLength, minLength, isEmail } from 'class-validator';
import { USERNAME_MAX_SIZE, USERNAME_MIN_SIZE } from '../constants';
import { isValidUsername } from '../decorators/IsValidUsername';
import { naughtyWords } from './naughty-words';
import { User, Wallet } from '@prisma/client';

export function findUsernameError(name: string) {
  if (typeof name !== 'string') {
    return `Bad name format: ${name || '<unknown>'}`;
  } else if (!maxLength(name, USERNAME_MAX_SIZE)) {
    return `Name can have max ${USERNAME_MAX_SIZE} characters`;
  } else if (!minLength(name, USERNAME_MIN_SIZE)) {
    return `Name can have min ${USERNAME_MIN_SIZE} characters`;
  } else if (!isValidUsername(name)) {
    return 'Name can only have A-Z, 0-9, underscore, and hypen characters';
  } else if (naughtyWords.includes(name.toLowerCase())) {
    return 'Naughty word detected. Please use another name or contact us if you think this is a mistake';
  }
}

export function validateName(name: string) {
  const usernameError = findUsernameError(name);
  if (usernameError) throw new BadRequestException(usernameError);
  return true;
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
