const words = require('an-array-of-english-words');
const Discord = require('discord.js');

let gameState = {};

const checkRunning = (channelId) => {
    return gameState[channelId]?.running;
};

const grab3letters = (WordsToFilter) => {
    WordsToFilter = WordsToFilter.filter(word => word.length >= 3);
    let selectedLetters = '';
    let count = 0;

    while (count < 1000) {
        const word = WordsToFilter[Math.floor(Math.random() * WordsToFilter.length)];
        const startIdx = Math.floor(Math.random() * (word.length - 2));
        selectedLetters = word.substring(startIdx, startIdx + 3);

        count = WordsToFilter.filter(word => word.includes(selectedLetters)).length;
    }

    return selectedLetters;
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

    // Convert the list of words to lowercase
    const lowercaseWords = words.map(word => word.toLowerCase());

    while (checkRunning(message.channel.id)) {
        for (const [userId, username] of participants) {
            if (!checkRunning(message.channel.id)) return;

            let collected = new Discord.Collection();
            const letters = grab3letters(lowercaseWords);

            console.log(`Generated letters: ${letters}`);

            const embed = new Discord.EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('BlackTea Game')
                .setDescription(`Type a valid word containing the letters: **${letters}**`);

            const gameMessage = await message.channel.send({ content: `<@${userId}>`, embeds: [embed] });

            let countdownSeconds = 15;

            const countdown = setInterval(async () => {
                if (!checkRunning(message.channel.id)) {
                    clearInterval(countdown);
                    return;
                }

                if (countdownSeconds > 0) {
                    countdownSeconds--;
                    if (countdownSeconds === 3) {
                        await gameMessage.react('3️⃣');
                    } else if (countdownSeconds === 2) {
                        await gameMessage.react('2️⃣');
                    } else if (countdownSeconds === 1) {
                        await gameMessage.react('1️⃣');
                    }
                } else {
                    clearInterval(countdown);
                }
            }, 1000);

            const filter = response => {
                return response.author.id === userId && response.content.toLowerCase().includes(letters);
            };

            let validAnswer = false;
            while (!validAnswer && countdownSeconds > 0) {
                try {
                    const collectedMessages = await message.channel.awaitMessages({
                        filter,
                        max: 1,
                        time: countdownSeconds * 1000,
                        errors: ['time']
                    });

                    if (!checkRunning(message.channel.id)) return;

                    const responseMessage = collectedMessages.first().content.toLowerCase();

                    if (lowercaseWords.includes(responseMessage)) {
                        collected = collected.concat(collectedMessages);
                        await collected.first().react('👍');
                        console.log(`${username} answered with a valid word: ${responseMessage}`);
                        validAnswer = true;
                    }
                } catch (err) {
                    console.log(`${username} did not respond with a valid word in time.`);
                    break;
                }
            }

            if (countdownSeconds > 0) clearInterval(countdown);
            if (!checkRunning(message.channel.id)) return;

            if (!validAnswer) {
                const remainingLives = lives.get(userId) - 1;
                lives.set(userId, remainingLives);
                await message.channel.send(`<@${userId}> did not answer with a valid word in time and lost a life. Remaining lives: ${remainingLives}`);

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