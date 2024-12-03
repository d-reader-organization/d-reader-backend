import config from '../configs/config';

export const dReaderUrl = config().client.dReaderUrl;
export const dPublisherUrl = config().client.dPublisherUrl;
export const apiUrl = config().nest.apiUrl;

export const D_READER_LINKS = {
  emailVerification: (verificationToken: string) =>
    `${dReaderUrl}/verify-email/${verificationToken}`,
  resetPassword: (verificationToken: string) =>
    `${dReaderUrl}/reset-password/${verificationToken}`,
  login: `${dReaderUrl}/login`,
  creator: (creatorSlug: string) => `${dReaderUrl}/creator/${creatorSlug}`,
  comicIssue: (comicIssueId: number) =>
    `${dReaderUrl}/comic-issue/${comicIssueId}`,
  comic: (comicSlug: string) => `${dReaderUrl}/comic/${comicSlug}`,
};

export const D_PUBLISHER_LINKS = {
  emailVerification: (verificationToken: string) =>
    `${dPublisherUrl}/verify-email/${verificationToken}`,
  resetPassword: (verificationToken: string) =>
    `${dPublisherUrl}/reset-password/${verificationToken}`,
  login: dPublisherUrl + '/login',
  logo: dPublisherUrl + '/logo192.png',
};
