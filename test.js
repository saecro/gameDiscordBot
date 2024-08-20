const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
require('dotenv').config()
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildInvites,
    ],
});

const guildId = '1131410686975684739';
const userId = '932381872414138388';
const roleId = '1271270055044186114';

client.once('ready', async () => {
    const guild = await client.guilds.fetch(guildId);
    await guild.members.unban(userId);
});



client.login(process.env.DISCORD_TOKEN);