const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
require('dotenv').config()
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildInvites,
    ],
});

const guildId = '1131410686975684739';
const userId = '805009105855971329';
const roleId = '1203894882742173808';

client.once('ready', async () => {
    try {
        // Fetch the guild by ID
        const guild = await client.guilds.fetch(guildId);
        if (!guild) {
            console.log(`Guild with ID ${guildId} not found.`);
            return;
        }

        // Fetch the member (user) by ID
        const member = await guild.members.fetch(userId);
        if (!member) {
            console.log(`User with ID ${userId} not found in guild.`);
            return;
        }

        // Fetch the role by ID
        const role = guild.roles.cache.get(roleId);
        if (!role) {
            console.log(`Role with ID ${roleId} not found.`);
            return;
        }

        // Add the role to the member
        await member.roles.add(role);
        console.log(`Role ${role.name} (${role.id}) added to user ${member.user.tag} (${member.id})`);

    } catch (error) {
        console.error(`Error adding role: ${error.message}`);
    } finally {
        // Log out the bot when done
        client.destroy();
    }
});



client.login(process.env.DISCORD_TOKEN);