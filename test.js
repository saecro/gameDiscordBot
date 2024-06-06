    const Discord = require('discord.js')

    require('dotenv').config();

    const client = new Discord.Client({
        intents: [
            Discord.GatewayIntentBits.Guilds,
            Discord.GatewayIntentBits.GuildMessages,
            Discord.GatewayIntentBits.MessageContent,
        ]
    });

    client.once('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
    })
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        message.channel.send('yo')
    })

    client.login(process.env.DISCORD_TOKEN);