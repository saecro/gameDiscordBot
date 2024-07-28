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
const USER_ID = '1130262772454789240';
const GUILD_ID = '1131410686975684739';
const ROLE_ID = '1267155410012606672'

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(USER_ID);
        
        if (member) {
            await member.roles.add(ROLE_ID);
        } else {
        }
    } catch (error) {
        console.error(`Error removing role: ${error}`);
    }
    
    client.destroy();  // Close the bot after the task is done
});

client.login(process.env.DISCORD_TOKEN);
