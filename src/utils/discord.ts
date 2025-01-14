import axios from 'axios';
import { User } from 'discord.js';

export const BASE_DISCORD_URL = 'https://discord.com/api';

export async function getDiscordUser(id: string) {
  const response = await axios.get<User>(`${BASE_DISCORD_URL}/users/${id}`, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    },
  });
  return response.data;
}
