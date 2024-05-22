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

        const goingToBeRaped = Math.floor(Math.random() * 10) + 1;
        const gotRaped = Math.floor(Math.random() * 10) + 1;
        const randomNumber = Math.floor(Math.random() * 10) + 1;
        const escapedRape = Math.floor(Math.random() * 10) + 1;

        try {
            const RapeResponses = {
                goingToBeRaped: [
                    `${mentionedUser}, You're about to get raped! Guess a number from 1 to 10 to escape the rapist.`,
                    `${mentionedUser}, dodge the incoming rapist! Choose a number between 1 and 10 to avoid it.`,
                    `${mentionedUser}, watch out! Pick a number from 1 to 10 to evade getting raped.`,
                    `${mentionedUser}, a rape is imminent! Guess a number from 1 to 10 to escape unscathed.`,
                    `${mentionedUser}, a rapist is coming your way! Choose a number between 1 and 10 to get away.`,
                    `${mentionedUser}, danger ahead! Pick a number from 1 to 10 to avoid getting raped.`,
                    `${mentionedUser}, incoming threat! Guess a number from 1 to 10 to sidestep it.`,
                    `${mentionedUser}, evade the danger! Choose a number between 1 and 10 to escape being raped.`,
                    `${mentionedUser}, brace yourself! Select a number from 1 to 10 to avoid the blow.`,
                    `${mentionedUser}, you're about to be struck! Guess a number from 1 to 10 to dodge being raped.`
                ],
                gotRaped: [
                    `${mentionedUser}, ouch! You got raped! Better luck next time.`,
                    `${mentionedUser}, you missed it! You've been raped!`,
                    `${mentionedUser}, that's gotta hurt! You didn't escape and you got raped..`,
                    `${mentionedUser}, you got raped! Try again next time.`,
                    `${mentionedUser}, you weren't fast enough! You got raped!`,
                    `${mentionedUser}, oh no! The rapist forced himself on you.`,
                    `${mentionedUser}, you couldn't dodge it! You got raped!`,
                    `${mentionedUser}, unlucky! You didn't avoid getting raped.`,
                    `${mentionedUser}, you've been raped! Better luck next time.`,
                    `${mentionedUser}, too bad! You couldn't escape and you got raped.`
                ],
                escapedRape: [
                    `${mentionedUser}, you guessed right and dodged the rapist! Well done!`,
                    `${mentionedUser}, you avoided getting raped just in time! Nice move!`,
                    `${mentionedUser}, that was a close one! You escaped the rapist!`,
                    `${mentionedUser}, you're safe from the rapist! Your guess was spot on!`,
                    `${mentionedUser}, you managed to evade being raped! Great job!`,
                    `${mentionedUser}, you got away without being raped! Good guess!`,
                    `${mentionedUser}, impressive! You dodged the rapist!`,
                    `${mentionedUser}, you successfully escaped from being raped! Excellent!`,
                    `${mentionedUser}, you're out of harm's way and the rapist can't catch you! Perfect guess!`,
                    `${mentionedUser}, nice escape! You avoided the rapist!`
                ],
            }
            const filter = response => {
                return !isNaN(response.content) && response.author.id === mentionedUser.id;
            };
            const rapeEmbed = new Discord.EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Rape')
                .setDescription(RapeResponses.goingToBeRaped[goingToBeRaped]);


            await message.channel.send({ embeds: [rapeEmbed] });

            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const guess = parseInt(collected.first().content);
            if (guess === randomNumber) {
                const embed = new Discord.EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Rape')
                    .setDescription(RapeResponses.escapedRape[escapedRape]);

                await message.channel.send({ embeds: [embed] });
            } else {
                const rapedEmbed = new Discord.EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Rape')
                    .setDescription(RapeResponses.gotRaped[gotRaped]);

                await message.channel.send({ embeds: [rapedEmbed] });
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
