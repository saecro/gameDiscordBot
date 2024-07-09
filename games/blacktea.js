const words = require('an-array-of-english-words');
const Discord = require('discord.js');

let gameState = {};

const checkRunning = (channelId) => {
    return gameState[channelId]?.running;
};

const grab3letters = (WordsToFilter) => {
    WordsToFilter = WordsToFilter.filter(word => word.length >= 3);
    WordsToFilter = WordsToFilter[Math.floor(Math.random() * WordsToFilter.length)];
    const startIdx = Math.floor(Math.random() * (WordsToFilter.length - 2));
    return WordsToFilter.substring(startIdx, startIdx + 3);
};

async function startBlackTea(message, participants) {
    let lives = new Map();
    participants.forEach((username, userId) => {
        lives.set(userId, 2);
    });

    gameState[message.channel.id] = {
        running: true,
        participants,
        lives
    };

    while (checkRunning(message.channel.id)) {
        for (const [userId, username] of participants) {
            if (!checkRunning(message.channel.id)) return;

            let collected = new Discord.Collection();
            const letters = grab3letters(words);

            console.log(`Generated letters: ${letters}`);

            const embed = new Discord.EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('BlackTea Game')
                .setDescription(`Type a word containing the letters: **${letters}**`);

            const gameMessage = await message.channel.send({ content: `<@${userId}>`, embeds: [embed] });

            const reactions = ['3️⃣', '2️⃣', '1️⃣'];
            let countdownSeconds = 10;

            const countdown = setInterval(async () => {
                if (!checkRunning(message.channel.id)) {
                    clearInterval(countdown);
                    return;
                }

                if (countdownSeconds > 0) {
                    countdownSeconds--;
                } else {
                    clearInterval(countdown);
                }
                if (countdownSeconds === 3) {
                    await gameMessage.react('3️⃣');
                } else if (countdownSeconds === 2) {
                    await gameMessage.react('2️⃣');
                } else if (countdownSeconds === 1) {
                    await gameMessage.react('1️⃣');
                }
            }, 1000);

            const filter = response => {
                return response.author.id === userId && response.content.includes(letters);
            };

            try {
                const collectedMessages = await message.channel.awaitMessages({
                    filter,
                    max: 1,
                    time: 10000,
                    errors: ['time']
                });
                if (!checkRunning(message.channel.id)) return;

                collected = collected.concat(collectedMessages);
                await collected.first().react('👍');
                console.log(`${username} answered with ${collected.first().content}`);
            } catch (err) {
                console.log(`${username} did not respond in time.`);
            }

            if (countdownSeconds > 0) clearInterval(countdown);
            if (!checkRunning(message.channel.id)) return;

            if (!collected.size) {
                const remainingLives = lives.get(userId) - 1;
                lives.set(userId, remainingLives);
                await message.channel.send(`<@${userId}> did not answer in time and lost a life. Remaining lives: ${remainingLives}`);

                if (remainingLives <= 0) {
                    await message.channel.send(`<@${userId}> is out of the game!`);
                    participants.delete(userId);
                }
            }

            if (participants.size === 1) {
                const winnerId = participants.keys().next().value;
                await message.channel.send(`<@${winnerId}> is the last one standing and wins the game!`);
                delete gameState[message.channel.id];
                return;
            }
        }
    }
}

async function endBlackTea(message) {
    if (gameState[message.channel.id]) {
        gameState[message.channel.id].running = false;
        delete gameState[message.channel.id];
        await message.channel.send('The blacktea game has been ended.');
        console.log(`Blacktea game in channel ${message.channel.id} has been ended.`);
    } else {
        await message.channel.send('No blacktea game is currently running.');
    }
}

module.exports = { startBlackTea, endBlackTea };
