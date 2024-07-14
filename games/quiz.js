const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');

let gameState = {};


const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8'));

const checkRunning = (channelId) => {
    return gameState[channelId]?.running;
};

async function startQuiz(message, participants) {
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
            const question = questions[Math.floor(Math.random() * questions.length)];
            currentQuestion = question;

            const embed = new Discord.EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Quiz Time!')
                .setDescription(`${question.question}\nA) ${question.A}\nB) ${question.B}\nC) ${question.C}\nD) ${question.D}`);

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
                return response.author.id === userId && ['A', 'B', 'C', 'D'].includes(response.content.toUpperCase());
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
            } else {
                const answer = collected.first().content.toUpperCase();
                if (answer !== question.answer) {
                    const remainingLives = lives.get(userId) - 1;
                    lives.set(userId, remainingLives);
                    await message.channel.send(`<@${userId}> answered incorrectly and lost a life. Correct answer was ${question.answer}. Remaining lives: ${remainingLives}`);

                    if (remainingLives <= 0) {
                        await message.channel.send(`<@${userId}> is out of the game!`);
                        participants.delete(userId);
                    }
                } else {
                    await message.channel.send(`<@${userId}> answered correctly!`);
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

async function endQuiz(message) {
    if (gameState[message.channel.id]) {
        gameState[message.channel.id].running = false;
        delete gameState[message.channel.id];
        await message.channel.send('You have exited the game.');
        console.log(`Quiz game in channel ${message.channel.id} has been ended.`);
    } else {
        await message.channel.send('No quiz game is currently running.');
    }
}

module.exports = { startQuiz, endQuiz };