const Discord = require('discord.js');

let gameState = {};

async function getRandomWord() {
    const { default: randomWords } = await import('random-words');
    let randomWord = randomWords();
    console.log('The word is: ' + randomWord);
    return randomWord;
}

const checkRunning = (channelId) => {
    return gameState[channelId]?.running;
};

async function startHangMan(message, participants) {
    let points = new Map();

    gameState[message.channel.id] = {
        running: true,
        participants,
        points
    };

    participants.forEach((username, id) => {
        points.set(id, 0);
    });

    while (checkRunning(message.channel.id)) {
        const chosenWord = await getRandomWord();
        const revealedWord = Array(chosenWord.length).fill('-');
        const userLives = new Map();
        const guessedLetters = new Set();

        participants.forEach((username, id) => {
            userLives.set(id, 3);
        });

        let currentIndex = 0;
        const userIds = Array.from(participants.keys());
        if (!checkRunning(message.channel.id)) {
            return false;
        }

        await message.channel.send(`A new word has been chosen. Start guessing letters or the entire word!`);

        while (Array.from(userLives.values()).some(lives => lives > 0) && revealedWord.includes('-') && checkRunning(message.channel.id)) {
            const currentUserId = userIds[currentIndex];
            const currentUserMention = `<@${currentUserId}>`;

            if (userLives.get(currentUserId) > 0) {
                if (!checkRunning(message.channel.id)) {
                    return false;
                }
                await message.channel.send(`Word: ${revealedWord.join(' ')}\n${currentUserMention}'s turn. You have ${userLives.get(currentUserId)} lives left. Guess a letter or the entire word!`);

                const filter = response => {
                    const isSingleLetter = /^[a-zA-Z]$/.test(response.content);
                    const correctUser = response.author.id === currentUserId;
                    return correctUser && (isSingleLetter || response.content.length === chosenWord.length);
                };

                let validGuess = false;
                let guess;
                while (!validGuess && checkRunning(message.channel.id)) {
                    if (!checkRunning(message.channel.id)) {
                        return false;
                    }
                    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
                    if (!collected) {
                        if (!checkRunning(message.channel.id)) {
                            return false;
                        }
                        await message.channel.send(`${currentUserMention} took too long!`);
                        userLives.set(currentUserId, userLives.get(currentUserId) - 1);
                        break;
                    }

                    guess = collected.first().content.toLowerCase();
                    if (guess.length === 1 && guessedLetters.has(guess)) {
                        if (!checkRunning(message.channel.id)) {
                            return false;
                        }
                        await message.channel.send(`You can't use this letter again, **${guess}** has already been guessed. Please try again.`);
                    } else {
                        validGuess = true;
                    }
                }

                if (!validGuess) continue;

                if (guess.length === 1) {
                    guessedLetters.add(guess);
                    if (chosenWord.includes(guess)) {
                        for (let i = 0; i < chosenWord.length; i++) {
                            if (chosenWord[i] === guess) {
                                revealedWord[i] = guess;
                            }
                        }
                    } else {
                        userLives.set(currentUserId, userLives.get(currentUserId) - 1);
                    }
                } else if (guess === chosenWord) {
                    if (!checkRunning(message.channel.id)) {
                        return false;
                    }
                    await message.channel.send(`Congratulations ${currentUserMention}! You guessed the word **${chosenWord}** and win the round!`);
                    points.set(currentUserId, points.get(currentUserId) + 5);
                    break;
                } else {
                    userLives.set(currentUserId, userLives.get(currentUserId) - 1);
                }

                if (!revealedWord.includes('-')) {
                    if (!checkRunning(message.channel.id)) {
                        return false;
                    }
                    await message.channel.send(`Congratulations! The word **${chosenWord}** was guessed!`);
                    points.set(currentUserId, points.get(currentUserId) + 5);
                }

                currentIndex = (currentIndex + 1) % userIds.length;
                await displayGuessedLetters(message, guessedLetters);
            } else {
                currentIndex = (currentIndex + 1) % userIds.length;
            }
        }

        if (Array.from(points.values()).some(score => score >= 30)) {
            const winnerId = Array.from(points.entries()).find(([id, score]) => score >= 30)[0];
            if (!checkRunning(message.channel.id)) {
                return false;
            }
            await message.channel.send(`Congratulations <@${winnerId}>! You have reached 30 points and won the game!`);
            break;
        }

        await displayLeaderboard(message, points);
    }

    delete gameState[message.channel.id];
}

async function displayLeaderboard(message, points) {
    const topUsers = Array.from(points.entries())
        .sort((a, b) => b[1] - a[1]);

    let leaderboardMessage = 'Current leaderboard:\n';
    topUsers.forEach(([userId, score], index) => {
        leaderboardMessage += `${index + 1}. <@${userId}>: ${score} points\n`;
    });

    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Leaderboard')
        .setDescription(leaderboardMessage);
    if (!checkRunning(message.channel.id)) {
        return false;
    }

    await message.channel.send({ embeds: [embed] });
}

async function displayGuessedLetters(message, guessedLetters) {
    const guessedLettersArray = Array.from(guessedLetters);
    const embed = new Discord.EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Guessed Letters')
        .setDescription(guessedLettersArray.join(', '));
    if (!checkRunning(message.channel.id)) {
        return false;
    }

    await message.channel.send({ embeds: [embed] });
}

async function endHangMan(message) {
    if (gameState[message.channel.id]) {
        gameState[message.channel.id].running = false;
        delete gameState[message.channel.id];
        if (!checkRunning(message.channel.id)) {
            return false;
        }
        await message.channel.send('You have exited the game.');
        console.log(`Hangman game in channel ${message.channel.id} has been ended.`);
    } else {
        if (!checkRunning(message.channel.id)) {
            return false;
        }
        await message.channel.send('No hangman game is currently running.');
    }
}

module.exports = { startHangMan, endHangMan };