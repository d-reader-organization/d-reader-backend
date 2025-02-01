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
