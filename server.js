const express = require('express');
const { Client, Intents } = require('discord.js');
const app = express();
const port = 3000; // You can choose any available port

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// Function to fetch bot guilds
function fetchBotGuilds() {
    console.log('Fetching bot guilds...');
    client.guilds.cache.forEach(guild => {
        console.log(`Guild Name: ${guild.name}, Guild ID: ${guild.id}`);
    });
}

// Route handler for the dashboard
app.get('/dashboard/:guildId', (req, res) => {
    const guildId = req.params.guildId;
    const guild = client.guilds.cache.get(guidId);
    
    if (!guild) {
        return res.status(404).send('Guild not found');
    }

    // Here you would typically render a dashboard page with guild data
    res.send(`Dashboard for guild: ${guild.name}`);
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Login to Discord with your app's token
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('guildCreate', guild => {
    fetchBotGuilds();
});

client.login('YOUR_BOT_TOKEN');