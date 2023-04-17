import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const SKIP_UPDATE_GUARD = 'skip-update-guard';

export const SkipUpdateGuard = (
  skip: boolean = true,
): CustomDecorator<string> => {
  return SetMetadata(SKIP_UPDATE_GUARD, skip);
};
