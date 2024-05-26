const Discord = require('discord.js');

async function getRandomWord() {
    const randomWords = await import('random-words');
    let randomWord = randomWords.generate();
    console.log('The word is: ' + randomWord);
    return randomWord;
}

async function startHangMan(message, participants) {
    let points = new Map();
    participants.forEach((username, id) => {
        points.set(id, 0);
    });

    while (true) {
        const chosenWord = await getRandomWord();
        const revealedWord = Array(chosenWord.length).fill('-');
        const userLives = new Map();
        const guessedLetters = new Set();

        participants.forEach((username, id) => {
            userLives.set(id, 3);
        });

        let currentIndex = 0;
        const userIds = Array.from(participants.keys());

        await message.channel.send(`A new word has been chosen. Start guessing letters or the entire word!`);

        while (Array.from(userLives.values()).some(lives => lives > 0) && revealedWord.includes('-')) {
            const currentUserId = userIds[currentIndex];
            const currentUserMention = `<@${currentUserId}>`;

            if (userLives.get(currentUserId) > 0) {
                await message.channel.send(`Word: ${revealedWord.join(' ')}\n${currentUserMention}'s turn. You have ${userLives.get(currentUserId)} lives left. Guess a letter or the entire word!`);

                const filter = response => {
                    const isSingleLetter = /^[a-zA-Z]$/.test(response.content);
                    const correctUser = response.author.id === currentUserId;
                    return correctUser && (isSingleLetter || response.content.length === chosenWord.length);
                };

                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
                if (!collected) {
                    await message.channel.send(`${currentUserMention} took too long!`);
                    userLives.set(currentUserId, userLives.get(currentUserId) - 1);
                } else {
                    const guess = collected.first().content.toLowerCase();
                    if (guess.length === 1) {
                        if (guessedLetters.has(guess)) {
                            await message.channel.send(`The letter **${guess}** has already been guessed.`);
                        } else {
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
                        }
                    } else if (guess === chosenWord) {
                        await message.channel.send(`Congratulations ${currentUserMention}! You guessed the word **${chosenWord}** and win the round!`);
                        points.set(currentUserId, points.get(currentUserId) + 5);
                        break;
                    } else {
                        userLives.set(currentUserId, userLives.get(currentUserId) - 1);
                    }
                }

                if (!revealedWord.includes('-')) {
                    await message.channel.send(`Congratulations! The word **${chosenWord}** was guessed!`);
                    points.set(currentUserId, points.get(currentUserId) + 5);
                }

                currentIndex = (currentIndex + 1) % userIds.length;
            } else {
                currentIndex = (currentIndex + 1) % userIds.length;
            }
        }

        if (Array.from(points.values()).some(score => score >= 30)) {
            const winnerId = Array.from(points.entries()).find(([id, score]) => score >= 30)[0];
            await message.channel.send(`Congratulations <@${winnerId}>! You have reached 30 points and won the game!`);
            break;
        }

        await displayLeaderboard(message, points);
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

module.exports = { startHangMan };
