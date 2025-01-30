import { ActivityType } from 'src/websockets/dto/activity-notification.dto';

export const WEBSOCKET_ROOMS = Object.freeze({
  ACTIVITY: 'activity',
  WALLET: (walletAddress: string) => `${walletAddress}`,
});

export const WEBSOCKET_EVENTS = Object.freeze({
  ACTIVITY_NOTIFICATION: 'activity-notification',
  LEAVE_ROOM: 'leave-room',
  WAVE: 'wave',
  JOIN_ROOM: 'join-room',
  WALLET_ITEM_MINTED: (walletAddress: string) =>
    `wallet/${walletAddress}/item-minted`,
});

export function getAdminActivityNotificationS3Folder(
  type: ActivityType,
  field: 'icon',
) {
  return `admin/activity/${type}/${field}`;
}

//TODO: construct a valid message for the activity
export function constructActivityNotificationMessage(type: ActivityType) {
  return `You've ${type}`;
}
