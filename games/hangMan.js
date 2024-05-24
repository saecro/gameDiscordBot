const Discord = require('discord.js');

async function getRandomWord() {
    const randomWords = await import('random-words');
    return randomWords.default({ exactly: 1, maxLength: 10 })[0].toLowerCase();
}

async function startHangMan(message, participants) {
    const chosenWord = await getRandomWord();
    const revealedWord = Array(chosenWord.length).fill('_');

    let attempts = 6;
    const guessedLetters = new Set();

    await message.channel.send(`The word has been chosen. Start guessing letters!`);

    while (attempts > 0 && revealedWord.includes('_')) {
        await message.channel.send(`Word: ${revealedWord.join(' ')}\nAttempts left: ${attempts}`);

        const filter = response => {
            const isParticipant = participants.has(response.author.id);
            const isSingleLetter = /^[a-zA-Z]$/.test(response.content);
            return isParticipant && isSingleLetter;
        };

        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
        if (!collected) {
            await message.channel.send('Time ran out! No one guessed a letter.');
            break;
        }

        const guess = collected.first().content.toLowerCase();
        if (guessedLetters.has(guess)) {
            await message.channel.send(`The letter **${guess}** has already been guessed.`);
            continue;
        }

        guessedLetters.add(guess);

        if (chosenWord.includes(guess)) {
            for (let i = 0; i < chosenWord.length; i++) {
                if (chosenWord[i] === guess) {
                    revealedWord[i] = guess;
                }
            }
        } else {
            attempts--;
        }
    }

    if (revealedWord.includes('_')) {
        await message.channel.send(`Game over! The word was **${chosenWord}**.`);
    } else {
        await message.channel.send(`Congratulations! You guessed the word **${chosenWord}**.`);
    }
}

module.exports = { startHangMan };
