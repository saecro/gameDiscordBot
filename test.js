const { Client, GatewayIntentBits, Poll } = require('discord.js');
require('dotenv').config()
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]
});

const guildId = '1131410686975684739';
const channelId = '1261996162597257308';

client.once('ready', async () => {
    console.log('Ready!');

    // Fetch the guild and channel
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.error('Guild not found');
        return;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        console.error('Channel not found or not a text channel');
        return;
    }

    try {
        // Create the poll
        const poll = new Poll({
            question: 'saecro for mod?',
            answers: ['Yes', 'No'],
            allowMultiselect: false,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        // Send the poll to the channel
        const pollMessage = await poll.send(channel);

        console.log('Poll created successfully:', pollMessage.url);
    } catch (error) {
        console.error('Error creating poll:', error);
    }
});

client.login(process.env.DISCORD_TOKEN);
