import { BadRequestException } from '@nestjs/common';
import { maxLength, minLength, isEmail } from 'class-validator';
import {
  PASSWORD_DIGIT_REGEX,
  PASSWORD_LOWERCASE_REGEX,
  PASSWORD_MIN_SIZE,
  PASSWORD_UPPERCASE_REGEX,
  USERNAME_MAX_SIZE,
  USERNAME_MIN_SIZE,
  USERNAME_REGEX,
} from '../constants';
import { naughtyWords } from './naughty-words';
import { User, Wallet } from '@prisma/client';

export function findUsernameError(name: string) {
  if (typeof name !== 'string') {
    return `Bad name format: ${name || '<unknown>'}`;
  } else if (!maxLength(name, USERNAME_MAX_SIZE)) {
    return `Name can have max ${USERNAME_MAX_SIZE} characters`;
  } else if (!minLength(name, USERNAME_MIN_SIZE)) {
    return `Name must have atleast ${USERNAME_MIN_SIZE} characters`;
  } else if (!USERNAME_REGEX.test(name)) {
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

export function findPasswordError(password: string) {
  if (typeof password !== 'string') {
    return `Bad password format: ${password || '<unknown>'}`;
  } else if (!minLength(password, PASSWORD_MIN_SIZE)) {
    return `Password must have atleast ${PASSWORD_MIN_SIZE} characters`;
  } else if (!PASSWORD_LOWERCASE_REGEX.test(password)) {
    return 'Password should include a lowercase character';
  } else if (!PASSWORD_UPPERCASE_REGEX.test(password)) {
    return 'Password should include an uppercase character';
  } else if (!PASSWORD_DIGIT_REGEX.test(password)) {
    return 'Password should include a number';
  }
}

export function validatePassword(password: string) {
  const passwordError = findPasswordError(password);
  if (passwordError) throw new BadRequestException(passwordError);
  return true;
}

export function validateCreatorHandle(handle: string) {
  if (typeof handle !== 'string') {
    throw new BadRequestException(
      `Bad handle format: ${handle || '<unknown>'}`,
    );
  } else if (!maxLength(handle, USERNAME_MAX_SIZE)) {
    throw new BadRequestException(`Max ${USERNAME_MAX_SIZE} characters`);
  } else if (!minLength(handle, USERNAME_MIN_SIZE)) {
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
