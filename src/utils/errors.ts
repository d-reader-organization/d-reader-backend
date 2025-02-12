import { CreatorActivityFeedType } from '@prisma/client';

export const ERROR_MESSAGES = {
  CANDY_MACHINE_NOT_FOUND: (address: string) =>
    `Candy Machine with address ${address} does not exist`,
  COUPON_NOT_ACTIVE: 'Coupon is not active yet.',
  COUPON_EXPIRED: 'Coupon is expired.',
  INVALID_MINTER_ADDRESS: 'Invalid minter address!',
  UNVERIFIED_TRANSACTION:
    'This transaction could not be verified. Please try again.',
  UNAUTHORIZED_COUPON: 'You are not authorized to use this coupon',
  MINT_LIMIT_REACHED: 'You have reached the maximum number of mints allowed.',
  USER_NOT_ELIGIBLE: 'You are not eligible for this mint!',
  WALLET_NOT_ELIGIBLE: 'Selected wallet is not eligible for this mint!',
  INVALID_TOKEN_STANDARD: 'Invalid token standard',
  SPL_TOKEN_NOT_SUPPORTED: 'SPL token is not supported',
  MALFORMED_FILE_UPLOAD:
    'File upload failed. Please ensure your file is in the correct format and try again.',
  BAD_CAROUSEL_SLIDE_DATA:
    'Carousel slide information is invalid. Please check the data and try again.',
  CAROUSEL_SLIDE_NOT_FOUND: (id: number) =>
    `Carousel slide with id ${id} not found`,
  BAD_COMIC_DATA: 'Comic data is invalid. Please check the data and try again.',
  COMIC_NOT_FOUND: (slug: string) => `Comic ${slug} does not exist`,
  TITLE_TAKEN: (title: string) => `${title} already taken`,
  SLUG_TAKEN: (slug: string) => `${slug} already taken`,
  PUBLISHED_COMIC_CANNOT_BE_DELETED: 'Published comic cannot be deleted',
  COMIC_ALREADY_HAS_EPISODE: (number: number) =>
    `Comic already has an episode number ${number}`,
  COMIC_ALREADY_HAS_ISSUE_WITH_SLUG: (slug: string) =>
    `Comic already has an episode with slug ${slug}`,
  COMIC_ALREADY_HAS_ISSUE_WITH_TITLE: (title: string) =>
    `Comic already has and episode with title ${title}`,
  COMIC_ISSUE_PUBLISHED_ON_CHAIN:
    'Comic episode is published on-chain and cannot be edited',
  BAD_COMIC_ISSUE_DATA:
    'Comic episode data is invalid. Please check the data and try again.',
  PDF_SIZE_EXCEEDS_LIMIT:
    'The PDF file is too large. Please upload a file smaller than 100 MB.',
  MISSING_STATELESS_COVERS: 'Comic episode is missing stateless covers',
  MISSING_STATEFUL_COVERS: 'Comic episode is missing stateful covers',
  INSUFFICIENT_SUPPLY: (requiredSupply: number, numberOfRarities: number) =>
    `Comic episode with ${numberOfRarities} rarities must have at least ${requiredSupply} supply`,
  COMIC_ISSUE_DOES_NOT_EXIST: (id: number) =>
    `Comic episode with id ${id} does not exist`,
  PUBLISHED_COMIC_ISSUE_CANNOT_BE_DELETED:
    'Published comic episode cannot be deleted',
  TOTAL_PAGE_SIZE_EXCEEDED: 'Total size of pages exceeded 100 MB',
  EMAIL_OR_USERNAME_REQUIRED:
    'Please enter either your email or username to continue.',
  INCORRECT_EMAIL_FORMAT: 'Incorrect email format',
  NEW_PASSWORD_DIFFERENT:
    'New password must be different from your current password.',
  EMAIL_ALREADY_VERIFIED: 'Email already verified',
  EMAIL_NOT_VERIFIED: 'Your email address has not been verified',
  CREATOR_NOT_FOUND: (id: number | string) => `Creator ${id} does not exist`,
  USER_ALREADY_HAS_CREATOR_CHANNEL: `User already has a creator channel`,
  NAME_ALREADY_TAKEN: (name: string) => `${name} already taken`,
  SLUG_ALREADY_TAKEN: (slug: string) => `${slug} already taken`,
  EMAIL_ALREADY_TAKEN: (email: string) => `${email} already taken`,
  ASSET_NOT_FOUND: (address: string) =>
    `Asset with address ${address} does not exist`,
  COLLECTION_ALREADY_EXISTS: '1/1 Collection with this address already exists!',
  ONE_OF_ONE_ALREADY_EXISTS: '1/1 with this address already exists!',
  EDITION_NOT_LISTED: 'Edition is not listed for sale',
  EDITION_SALE_NOT_STARTED: 'This edition is not available for purchase yet.',
  EDITION_SALE_ENDED: 'Edition sale has ended',
  PRINT_EDITION_COLLECTION_ALREADY_EXISTS:
    'Print Edition Collection with this address already exists!',
  COLLECTION_DOES_NOT_EXIST: "Collection doesn't exist in database",
  ERROR_SYNCING_RECEIPT: (id: number) => `Error syncing receipt ${id}`,
  COMIC_ISSUE_SALE_ALREADY_REQUESTED: `Comic episode already has a sale requested`,
  BAD_DRAFT_ISSUE_DATA: 'Comic sales data is invalid.',
  COMIC_ISSUE_DRAFT_SALE_DATA_NOT_FOUND: `Comic episode sales data not found`,
  FORBIDDEN_UPDATE: 'Cannot update while processing your data',
  BAD_GENRE_DATA: 'Genre data is invalid.',
  GENRE_NOT_FOUND: (slug: string) => `Genre ${slug} does not exist`,
  CANNOT_DELETE_USED_GENRE: "Cannot delete genre that's being used",
  CURRENCY_NOT_SUPPORTED: 'Currency not supported!',
  ALREADY_EXPRESSED_INTEREST: "You've already expressed interest to invest!",
  TRANSACTION_FAILED: 'Failed to send transaction',
  UNABLE_TO_SEND_MAIL: (type: string) =>
    `Unable to send "${type}" mail, check your email address`,
  UNAUTHORIZED_UNWRAP: `Not authorized to unwrap the comic. Make sure your wallet is connected to the app!`,
  COMIC_ALREADY_SIGNED: 'Comic is already signed!',
  ONLY_VERIFIED_CREATOR_CAN_SIGN: 'Only the verified creator can sign a comic',
  SIGNING_NOT_ACTIVE:
    'Creator discord account verification is pending, Signing will begin soon !',
  UNAUTHORIZED_CHANGE_COMIC_STATE: 'Not authorized to change the comic state',
  USER_NOT_FOUND: ({
    key,
    value,
  }: {
    key: 'id' | 'email';
    value: string | number;
  }) => `User with ${key} ${value} not found`,
  USERNAME_ALREADY_TAKEN: (name: string) => `${name} already taken`,
  GOOGLE_ACCOUNT_LINKED:
    'This user is linked to a Google Account. Please use google sign in.',
  PASSWORD_MUST_BE_DIFFERENT:
    'New password must be different from the current password',
  REFERRER_NAME_OR_ADDRESS_UNDEFINED: 'Referrer name, or address undefined',
  REFEREE_ID_MISSING: 'Referee id missing',
  USER_ALREADY_REFERRED: (username: string) =>
    `User '${username}' already referred`,
  WALLET_NOT_FOUND: (address: string) =>
    `Wallet with address ${address} not found`,
  REFERRAL_BONUS_ERROR: (error: any) =>
    `Error while making the user eligible for a referral bonus: ${error}`,
  SUBSCRIBE_FAILED: (address: string) =>
    `Failed to subscribe to address ${address}`,
  BURN_ERROR: (address: string) => `Error handling burn for asset ${address}`,
  NONCE_UPDATE_FAILED: 'Failed to update nonce',
  ASSET_TRANSFER_FAILED: (address: string) =>
    `Failed to index Core Asset ${address} While transfer event`,
  CANCEL_LISTING_FAILED: 'Failed to handle cancel listing',
  LISTING_FAILED: 'Failed to handle asset listing',
  LEGACY_ASSET_LISTING_FAILED: 'Failed to handle legacy asset listing',
  LEGACY_ASSET_TRANSFER_FAILED: 'Failed to handle legacy asset transfer',
  COMIC_STATE_UPDATE_FAILED: 'Failed to handle comic state update',
  BUY_ASSET_FAILED: 'Error while core asset buying webhook event',
  WINNING_PROBABILITY: 'Winning probability should be between 1-99',
  WHEEL_NOT_EXISTS: (id: number) => `Wheel with id ${id} doesn't exists`,
  NO_ACTIVE_WHEELS_FOUND: 'There are no active wheels',
  REWARD_NOT_EXISTS: (id: number) => `Reward with id ${id} does not exists`,
  CONNECT_WALLET: 'Please connect your wallet to claim digital rewards!',
  WHEEL_NOT_ACTIVE: 'Wheel is not active!',
  SPIN_FAILED: 'Failed to spin the wheel!',
  WHEEL_EXPIRED: 'Wheel has been expired!',
  NO_SPIN_LEFT: (cooldownMessage: string) =>
    `You have used all your available spins. Try again in ${cooldownMessage}.`,
  PRIVY_NO_ACCOUNT_OR_WALLET: 'Account or wallet not provided',
  INVALID_RESPONSE_BODY: 'Invalid response body',
  SIGNATURE_REQUEST_PENDING: (address: string) =>
    `signature request for comic ${address} is pending, wait for sometime before requesting again`,
  FAILED_TO_INDEX_ACTIVITY: (
    id: string,
    type: CreatorActivityFeedType,
    e: Error,
  ) => `failed to index activity ${type} for id ${id} : ${e.toString()}`,
  FAILED_TO_TAKE_SNAPSHOT: (
    id: string,
    type: 'comicIssue' | 'comic' | 'creator',
    e: Error,
  ) => `failed to take snapshot for ${type} with id ${id} : ${e.toString()}`,
};
