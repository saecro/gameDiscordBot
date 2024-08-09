const fs = require('fs')
const Discord = require('discord.js');
const readline = require('readline');
require('dotenv').config()
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


const USER_ID = '522993811375390723'

const guildId = '1131410686975684739'; // Replace with your guild's ID
const newNickname = 'cumslut'; // The new nickname you want to set

client.once('ready', async () => {
    console.log('Bot is online!');

    try {
        // Fetch the guild
        const guild = await client.guilds.fetch(guildId);

        // Fetch the guild member
        const member = await guild.members.fetch(USER_ID);

        // Change the nickname
        await member.setNickname(newNickname);
        console.log(`Changed nickname of ${member.user.tag} to ${newNickname}`);
    } catch (error) {
        console.error('Error changing nickname:', error);
    }
});
// Login to Discord with your app's token
client.login(process.env.DISCORD_TOKEN);