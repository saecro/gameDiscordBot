// Import the discord.js module
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config()
// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Token of your bot

// Guild and user ID you want to ban
const guildId = '1131410686975684739';
const userId = '989853033271808030';

// When the client is ready, run this code
client.once('ready', async () => {
  console.log('Ready!');

  try {
    // Fetch the guild
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      console.error('Guild not found!');
      return;
    }

    // Fetch the member
    const member = await guild.members.fetch(userId);
    if (!member) {
      console.error('Member not found!');
      return;
    }

    // Ban the member
    await member.ban({ reason: 'Banned by bot script' });
    console.log(`Banned ${member.user.tag} from ${guild.name}`);
  } catch (error) {
    console.error('Error banning member:', error);
  } finally {
    // Log out the client after operation
    client.destroy();
  }
});

// Login to Discord with your bot's token
client.login(process.env.DISCORD_TOKEN);
