const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const MongoClient = require('mongodb').MongoClient;
const mongoClient = new MongoClient(process.env.MONGO_URI);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const db = (await mongoClient.connect()).db('gameDiscordBot');
    const botGuilds = client.guilds.cache.map(guild => ({
        id: guild.id,
        name: guild.name
    }));

    await db.collection('botGuilds').deleteMany({});
    await db.collection('botGuilds').insertMany(botGuilds);
    console.log('Bot guilds saved to database:', botGuilds);

    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);