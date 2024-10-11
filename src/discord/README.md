# Discord Bot - Comic Creation Notification

This README explains the importance of properly formatting embeds when sending messages through a Discord bot, especially when you want to include button actions.

## Message Structure

When creating a message payload for a Discord bot, it's crucial to structure your embeds correctly if you want to include interactive elements like buttons. Here's an example of how to format your message:

```typescript
export const COMIC_CREATED = ({
  comic,
  hyperlink,
  payload,
}: {
  comic: Comic;
  hyperlink: string;
  payload: MessagePayload;
}) => {
  payload.body = {
    content: `📗 ${bold(comic.title)} comic series created! [Details](${hyperlink})`,
    embeds: [
      {
        title: DiscordKey.Comic + DISCORD_KEY_SEPARATOR + comic.slug,
      },
    ],
  };
  return payload;
};
```

## Importance of Embed Format

The `embeds` array in the message payload is crucial for enabling button actions. Here's why:

1. **Unique Identifier**: The `title` field in the embed is used as a unique identifier for the message. This is essential for associating buttons with specific messages.

2. **Format**: The title is formatted as `DiscordKey.Comic + DISCORD_KEY_SEPARATOR + comic.slug`. This structure allows the bot to parse the information and determine which actions are available for this specific comic.

3. **Button Association**: When buttons are added to the message, they will be associated with this embed. The bot can then use the information in the embed's title to perform the correct actions when a button is clicked.

## Best Practices

- Always include an embed with a properly formatted title when you want to add button actions to your message.
- Use consistent key structures (like `DiscordKey.Comic`) to categorize different types of embeds.
- Include a separator (DISCORD_KEY_SEPARATOR) to make parsing the embed title easier.
- Ensure that the `slug` or any other identifier used is unique for each item to avoid conflicts.

## Example Usage

When sending a message about a new comic creation:

1. Create the payload using the `COMIC_CREATED` function.
2. Send the message using your Discord bot's send method.
3. When setting up button actions, use the embed's title to determine which actions are available and how to handle them.

By following this structure, you ensure that your Discord bot can correctly associate button actions with specific messages and perform the right actions when users interact with the buttons.