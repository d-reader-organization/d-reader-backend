import { BadRequestException } from '@nestjs/common';
import { maxLength, minLength, isEmail } from 'class-validator';
import { USERNAME_MAX_SIZE, USERNAME_MIN_SIZE } from '../constants';
import { isValidUsername } from '../decorators/IsValidUsername';

export function validateName(name: string) {
  if (!name) {
    return;
  } else if (!maxLength(name, USERNAME_MAX_SIZE)) {
    throw new BadRequestException(`Max ${USERNAME_MAX_SIZE} characters`);
  } else if (!minLength(name, USERNAME_MIN_SIZE)) {
    throw new BadRequestException(`Min ${USERNAME_MIN_SIZE} characters`);
  } else if (!isValidUsername(name)) {
    throw new BadRequestException('Only have A-Z,0-9,- characters allowed');
  }
}

export function validateEmail(email: string) {
  if (!email) {
    return;
  } else if (!isEmail(email)) {
    throw new BadRequestException(`Incorrect email format: ${email}`);
  }
}
