export const ERROR_MESSAGES = {
  CANDY_MACHINE_NOT_FOUND: (address: string) =>
    `Candy Machine with address ${address} does not exist`,
  COUPON_NOT_ACTIVE: 'Coupon is not active yet.',
  COUPON_EXPIRED: 'Coupon is expired.',
  INVALID_MINTER_ADDRESS: 'Invalid minter address!',
  UNVERIFIED_TRANSACTION: 'Unverified Transaction',
  UNAUTHORIZED_COUPON: 'Unauthorized to use this coupon',
  MINT_LIMIT_REACHED: 'Mint limit reached!',
  USER_NOT_ELIGIBLE: 'User is not eligible for this mint!',
  WALLET_NOT_ELIGIBLE: 'Wallet selected is not eligible for this mint!',
  INVALID_TOKEN_STANDARD: 'Invalid token standard',
  SPL_TOKEN_NOT_SUPPORTED: 'Spl token is not supported',
  MALFORMED_FILE_UPLOAD: 'Malformed file upload',
  BAD_CAROUSEL_SLIDE_DATA: 'Bad carousel slide data',
  CAROUSEL_SLIDE_NOT_FOUND: (id: number) =>
    `Carousel slide with id ${id} not found`,
  BAD_COMIC_DATA: 'Bad comic data',
  COMIC_NOT_FOUND: (slug: string) => `Comic ${slug} does not exist`,
  TITLE_TAKEN: (title: string) => `${title} already taken`,
  SLUG_TAKEN: (slug: string) => `${slug} already taken`,
  PUBLISHED_COMIC_CANNOT_BE_DELETED: 'Published comic cannot be deleted',
  COMIC_ALREADY_HAS_EPISODE: (number: number) =>
    `Comic already has episode number ${number}`,
  COMIC_ALREADY_HAS_ISSUE_WITH_SLUG: (slug: string) =>
    `Comic already has issue with slug ${slug}`,
  COMIC_ALREADY_HAS_ISSUE_WITH_TITLE: (title: string) =>
    `Comic already has issue with title ${title}`,
  COMIC_PUBLISHED: 'Comic already published',
  COMIC_PUBLISHED_ON_CHAIN:
    'Comic issue published on-chain and cannot be edited',
  BAD_COMIC_ISSUE_DATA: 'Bad comic issue data',
  PDF_SIZE_EXCEEDS_LIMIT: 'Pdf size is more than 100 mb',
  MISSING_STATELESS_COVERS: 'Comic issue missing stateless covers',
  MISSING_STATEFUL_COVERS: 'Comic issue missing stateful covers',
  INSUFFICIENT_SUPPLY: (required: number, actual: number) =>
    `Comic issue with ${actual} rarities must have at least ${required} supply`,
  COMIC_ISSUE_DOES_NOT_EXIST: (id: number) =>
    `Comic issue with id ${id} does not exist`,
  PUBLISHED_COMIC_ISSUE_CANNOT_BE_DELETED:
    'Published comic issue cannot be deleted',
  TOTAL_SIZE_EXCEEDED: 'Total size of pages exceeded 100 MB',
  EMAIL_OR_USERNAME_REQUIRED: 'Please provide email or username',
  INCORRECT_EMAIL_FORMAT: 'Incorrect email format',
  NEW_PASSWORD_DIFFERENT:
    'New password must be different from current password',
  EMAIL_ALREADY_VERIFIED: 'Email already verified',
  CREATOR_NOT_FOUND: (slug: string) => `Creator ${slug} does not exist`,
  NAME_ALREADY_TAKEN: (name: string) => `${name} already taken`,
  SLUG_ALREADY_TAKEN: (slug: string) => `${slug} already taken`,
  EMAIL_ALREADY_TAKEN: (email: string) => `${email} already taken`,
  ASSET_NOT_FOUND: (address: string) =>
    `Asset with address ${address} does not exist`,
  COLLECTION_ALREADY_EXISTS:
    '1/1 Collection with this address already exists !',
  ONE_OF_ONE_ALREADY_EXISTS: '1/1 with this address already exists !',
  EDITION_NOT_LISTED: 'Edition is not listed for sale',
  EDITION_SALE_NOT_STARTED: 'Edition sale has not started',
  EDITION_SALE_ENDED: 'Edition sale has ended',
  PRINT_EDITION_COLLECTION_ALREADY_EXISTS:
    'Print Edition Collection with this address already exists !',
  COLLECTION_DOES_NOT_EXIST: "Collection doesn't exist in database",
  ERROR_SYNCING_RECEIPT: (id: number) => `Error syncing receipt ${id}`,
  PENDING_ISSUE_REQUEST: (comicIssueId: number) =>
    `There is pending request for comic issue with id ${comicIssueId}`,
  BAD_DRAFT_ISSUE_DATA: 'Bad draft comic issue sales data',
  ISSUE_DRAFT_SALE_DATA_NOT_FOUND: (id: number) =>
    `Draft comic issue sales data with id ${id} does not exist`,
  FORBIDDEN_UPDATE: 'Cannot update while your processing your data',
  BAD_GENRE_DATA: 'Bad genre data',
  GENRE_NOT_FOUND: (slug: string) => `Genre ${slug} does not exist`,
  CANNOT_DELETE_USED_GENRE: "Cannot delete genre that's being used",
  CURRENCY_NOT_SUPPORTED: 'Currency not supported!',
  ALREADY_EXPRESSED_INTEREST: "You've already expressed interest!",
  TRANSACTION_FAILED: 'Failed to send transaction',
  UNABLE_TO_SEND_MAIL: (type: string) =>
    `Unable to send "${type}" mail, check your email address`,
  UNAUTHORIZED_UNWRAP: `Unauthorized to unwrap the comic, make sure you've correct wallet connected to the app!`,
  COMIC_ALREADY_SIGNED: 'Comic is already signed',
  ONLY_VERIFIED_CREATOR_CAN_SIGN: 'Only verified creator can sign a comic',
  UNAUTHORIZED_CHANGE_COMIC_STATE: 'Unauthorized to change comic state',
  USER_NOT_FOUND: (id: number) => `User with id ${id} not found`,
  USERNAME_ALREADY_TAKEN: (name: string) => `${name} already taken`,
  GOOGLE_ACCOUNT_LINKED:
    'This user is linked to a Google Account. Please use google sign in.',
  PASSWORD_MUST_BE_DIFFERENT:
    'New password must be different from current password',
  REFERRER_NAME_OR_ADDRESS_UNDEFINED: 'Referrer name, or address undefined',
  REFEREE_ID_MISSING: 'Referee id missing',
  USER_ALREADY_REFERRED: (username: string) =>
    `User '${username}' already referred`,
  NO_SGT_TOKEN_FOUND: 'No SGT Token found',
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
  LEGACY_ASSET_TRANSFER_FAILED: 'Failed to handle Legacy asset transfer',
  COMIC_STATE_UPDATE_FAILED: 'Failed to handle comic state update',
  BUY_ASSET_FAILED: 'Error while core asset buying webhook event',
  WINNING_PROBABILITY: 'Winning probability should be between 1-99',
  WHEEL_NOT_EXISTS: (id: number) => `Wheel with id ${id} doesn't exists`,
  REWARD_NOT_EXISTS: (id: number) => `Reward with id ${id} does not exists`,
  CONNECT_WALLET: 'Please connect wallet to be able to claim digital rewards !',
  WHEEL_NOT_ACTIVE: 'Wheel is not active !',
  WHEEL_EXPIRED: 'Wheel has been expired !',
  NO_SPIN_LEFT: (cooldownMessage: string) =>
    `You don't have any spin left, spin again in ${cooldownMessage}`,
};
