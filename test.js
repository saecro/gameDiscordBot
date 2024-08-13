const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
require('dotenv').config()
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildInvites,
    ],
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const inviteLinks = [];

    for (const [guildId, guild] of client.guilds.cache) {
        try {
            // Fetching the first available text channel in the server where the bot can create an invite
            const channel = guild.channels.cache.find(
                ch => 
                    ch.isTextBased() && 
                    ch.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.CreateInstantInvite)
            );

            if (!channel) {
                console.log(`No channel with invite permission found in ${guild.name}`);
                continue;
            }

            // Create an invite for the selected channel
            const invite = await channel.createInvite({ maxAge: 0, maxUses: 1, unique: true });
            inviteLinks.push({ guild: guild.name, invite: invite.url });
            console.log(`Created invite for ${guild.name}: ${invite.url}`);
        } catch (error) {
            console.error(`Could not create invite for ${guild.name}:`, error);
        }
    }

    console.log('All invite links:', inviteLinks);
});

client.login(process.env.DISCORD_TOKEN);