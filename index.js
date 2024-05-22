const Discord = require('discord.js');
const quiz = require('./games/quiz.js')
const mathGame = require('./games/mathGame.js')
const wordGame = require('./games/wordGame.js')
require('dotenv').config();

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMessageReactions,
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/g);
    const command = args[0].toLowerCase();

    if (command === '!startquiz') {
        const participants = await startJoinPhase(message);
        if (participants.size > 0) {
            await startQuizGame(message, participants);
        } else {
            message.channel.send('No one joined the game.');
        }
    } else if (command === '!startwordgame') {
        const participants = await startJoinPhase(message);
        if (participants.size > 0) {
            await startWordGame(message, participants);
        } else {
            message.channel.send('No one joined the game.');
        }
    } else if (command === '!startmathgame') {
        const participants = await startJoinPhase(message);
        if (participants.size > 0) {
            await startMathGame(message, participants);
        } else {
            message.channel.send('No one joined the game.');
        }
    } else if (command === '!rape') {
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
            return message.channel.send('You need to mention a user to rape!');
        }

        const randomNumber = Math.floor(Math.random() * 10) + 1;

        try {
            const filter = response => {
                return !isNaN(response.content) && response.author.id === mentionedUser.id;
            };

            const sentMessage = await message.channel.send(`${mentionedUser}, guess a number between 1 and 10.`);

            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const guess = parseInt(collected.first().content);

            if (guess === randomNumber) {
                const embed = new Discord.EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Rape')
                    .setDescription(`<@${mentionedUser.id}> you will not get raped!`);

                await message.channel.send({ embeds: [embed] });
            } else {
                await message.channel.send(`<@${mentionedUser.id}>, you got raped!`);
            }

        } catch (err) {
            console.error(err);
            message.channel.send(`${mentionedUser.username} did not respond in time.`);
        }
    }
});

async function startJoinPhase(message) {
    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('React to Participate')
        .setDescription('React with ✅ to participate in the game! You have 5 seconds.');

    const gameMessage = await message.channel.send({ embeds: [embed] });
    await gameMessage.react('✅');

    const participants = new Map();

    const filter = (reaction, user) => {
        return reaction.emoji.name === '✅' && !user.bot;
    };

    const collector = gameMessage.createReactionCollector({ filter, time: 5000 });

    collector.on('collect', (reaction, user) => {
        if (!participants.has(user.id)) {
            participants.set(user.id, user.username);
            sendTemporaryEmbed(message.channel, `${user.username} has joined the game!`, user);
        }
    });

    return new Promise(resolve => {
        collector.on('end', collected => {
            resolve(participants);
        });
    });
}

async function sendTemporaryEmbed(channel, description, user) {
    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(description);

    const joinMessage = await channel.send({ embeds: [embed], content: `<@${user.id}> has joined the game!` });
    setTimeout(() => {
        joinMessage.delete().catch(console.error);
    }, 5000); // Delete after 5 seconds
}

async function startQuizGame(message, participants) {

    message.channel.send(`Starting quiz game with: ${Array.from(participants.values()).join(', ')}`);
    await quizGame.startQuiz(message, participants);
}

async function startWordGame(message, participants) {
    // Placeholder for actual word game logic
    message.channel.send(`Starting word game with: ${Array.from(participants.values()).join(', ')}`);
    await wordGame.startWordGame(message, participants);
}

async function startMathGame(message, participants) {
    // Placeholder for actual math game logic
    message.channel.send(`Starting math game with: ${Array.from(participants.values()).join(', ')}`);
    await mathGame.startMathGame(message, participants);
}

client.login(process.env.DISCORD_TOKEN);
