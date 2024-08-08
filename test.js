// Import the Discord.js module
const Discord = require('discord.js');
require('dotenv').config();

// Create a new client instance
const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMessageReactions,
        Discord.GatewayIntentBits.GuildMembers
    ]
});

const guildId = '1131410686975684739';
const userId = '805009105855971329';
const roleId = '1203894882742173808';

client.once('ready', async () => {
    console.log('Bot is online!');

    try {
        // Fetch the guild (server)
        const guild = await client.guilds.fetch(guildId);
        
        if (!guild) {
            console.error('Guild not found');
            return;
        }

        // Fetch the member (user) to give the role to
        const member = await guild.members.fetch(userId);
        
        if (!member) {
            console.error('Member not found');
            return;
        }

        // Fetch the role
        const role = await guild.roles.fetch(roleId);
        
        if (!role) {
            console.error('Role not found');
            return;
        }

        // Add the role to the member
        await member.roles.add(role, 'Giving role via script');
        console.log(`Gave role ${role.name} to ${member.user.tag}`);

    } catch (error) {
        console.error('An error occurred:', error);
    }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);