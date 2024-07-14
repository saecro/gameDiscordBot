const Discord = require('discord.js');
const operations = ["+", "-", "*", "/"];
const medals = {
    '🥇': 5,
    '🥈': 3,
    '🥉': 1
};

let gameState = {};

const checkRunning = (channelId) => {
    return gameState[channelId]?.running;
};

async function startMathGame(message, participants) {
    let points = new Map();

    
    gameState[message.channel.id] = {
        running: true,
        participants,
        points
    };

    while (checkRunning(message.channel.id)) {
        let collected = new Discord.Collection();

        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operation = operations[Math.floor(Math.random() * operations.length)];

        const question = `${num1} ${operation} ${num2}`;
        let answer;
        switch (operation) {
            case "+":
                answer = num1 + num2;
                break;
            case "-":
                answer = num1 - num2;
                break;
            case "*":
                answer = num1 * num2;
                break;
            case "/":
                answer = num1 / num2;
                break;
        }

        console.log(`Generated question: ${question} with answer: ${answer}`);

        await message.channel.send(`Solve: ${question}`);
        let placed = 0;

        const answeredUsers = new Set();
        const filter = async (response, collected) => {
            if (!checkRunning(message.channel.id)) {
                return false;
            }

            const isCorrect = !isNaN(response.content) && parseFloat(response.content) === answer;
            const isNotBot = response.author.id !== message.client.user.id;
            const hasNotAnswered = !answeredUsers.has(response.author.id);
            const isParticipant = participants.has(response.author.id);
            console.log(`${response.author.username} answered with ${response.content}`);
            console.log(`isCorrect: ${isCorrect}, isNotBot: ${isNotBot}, hasNotAnswered: ${hasNotAnswered}, isParticipant: ${isParticipant}`);

            if (isCorrect && isNotBot && hasNotAnswered && isParticipant) {
                answeredUsers.add(response.author.id);

                const medal = Object.keys(medals)[placed];
                placed++;
                if (medal) {
                    console.log(`Reacting with ${medal} for ${response.author.username}`);
                    await response.react(medal);
                    console.log(`Reacted with ${medal}`);
                }
            }

            return isCorrect && isNotBot && hasNotAnswered && isParticipant;
        };

        try {
            const newMessages = await message.channel.awaitMessages({
                filter: (response) => filter(response, collected),
                max: 3,
                time: 15000
            });
            if (!checkRunning(message.channel.id)) return;
            collected = collected.concat(newMessages);
            console.log(`Collected messages: ${JSON.stringify(collected.map(msg => ({ author: msg.author.username, content: msg.content })))}`);
        } catch (err) {
            console.log('No messages collected within the time limit.');
        }

        if (!checkRunning(message.channel.id)) return; 

        let scoresMessage = 'Scores this round:\n';
        if (collected.size > 0) {
            let place = 0;
            for (const response of collected.values()) {
                const user = response.author;
                console.log(`Correct answer by: ${user.username}`);
                if (!points.has(user.id)) {
                    points.set(user.id, 0);
                }
                const userPoints = points.get(user.id) + Object.values(medals)[place];
                points.set(user.id, userPoints);
                scoresMessage += `<@${user.id}> - ${Object.values(medals)[place]}\n`;
                console.log(`Awarding ${Object.values(medals)[place]} points to ${user.username} (Total: ${userPoints})`);
                place++;
                if (userPoints >= 30) {
                    console.log(`${user.username} has reached 30 points and won the game!`);
                    if (checkRunning(message.channel.id)) {
                        await message.channel.send(scoresMessage);
                        await displayLeaderboard(message, points);
                        await message.channel.send(`Congratulations <@${user.id}>! You have reached 30 points and won the game!`);
                    }
                    delete gameState[message.channel.id];
                    return;
                }
            }
        } else {
            console.log('No correct answers this round.');
            scoresMessage += 'No correct answers.';
        }

        if (checkRunning(message.channel.id)) {
            await message.channel.send(scoresMessage);
            console.log(`Sent scores message: ${scoresMessage}`);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));

        if (checkRunning(message.channel.id)) {
            await displayLeaderboard(message, points);
        }
    }
}

async function displayLeaderboard(message, points) {
    const topUsers = Array.from(points.entries())
        .sort((a, b) => b[1] - a[1]);

    let leaderboardMessage = 'Current leaderboard:\n';
    topUsers.forEach(([userId, score], index) => {
        leaderboardMessage += `${index + 1}. <@${userId}>: ${score} points\n`;
        console.log(`Leaderboard - ${index + 1}: <@${userId}> with ${score} points`);
    });

    await message.channel.send(leaderboardMessage);
    console.log(`Sent leaderboard message: ${leaderboardMessage}`);
}

async function endMathGame(message) {
    if (gameState[message.channel.id]) {
        gameState[message.channel.id].running = false;
        delete gameState[message.channel.id];
        await message.channel.send('You have exited the game.');
        console.log(`Math game in channel ${message.channel.id} has been ended.`);
    } else {
        await message.channel.send('No math game is currently running.');
    }
}

module.exports = { startMathGame, endMathGame };
