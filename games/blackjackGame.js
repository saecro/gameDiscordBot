const Discord = require('discord.js');

const suits = ['♠️', '♥️', '♣️', '♦️'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    const deck = [];
    for (let i = 0; i < suits.length; i++) {
        for (let j = 0; j < values.length; j++) {
            deck.push(`${values[j]}${suits[i]}`);
        }
    }
    return shuffle(deck);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;
    for (const card of hand) {
        const cardValue = card.slice(0, -2);
        if (cardValue === 'A') {
            aces++;
            value += 11;
        } else if (['K', 'Q', 'J'].includes(cardValue)) {
            value += 10;
        } else {
            value += parseInt(cardValue);
        }
    }
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    return value;
}

async function startBlackjackGame(message, participants) {
    const players = Array.from(participants.keys());
    const playerHands = new Map();
    const playerScores = new Map();
    const dealerHand = [];

    const deck = createDeck();

    for (const playerId of players) {
        playerHands.set(playerId, [deck.pop(), deck.pop()]);
        playerScores.set(playerId, 0);
    }
    dealerHand.push(deck.pop(), deck.pop());

    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Blackjack Game')
        .setDescription('The game has started! Here are the initial hands:');

    for (const [playerId, hand] of playerHands.entries()) {
        const player = await message.client.users.fetch(playerId);
        embed.addFields({ name: player.username, value: hand.join(' ') });
    }
    embed.addFields({ name: 'Dealer', value: `${dealerHand[0]} ?` });

    await message.channel.send({ embeds: [embed] });

    for (const playerId of players) {
        const player = await message.client.users.fetch(playerId);
        await playerTurn(message, player, playerHands, playerScores, deck);
    }

    await dealerTurn(message, dealerHand, deck);

    const winners = determineWinners(playerScores, dealerHand);
    await displayResults(message, winners);
}

async function playerTurn(message, player, playerHands, playerScores, deck) {
    const hand = playerHands.get(player.id);
    let score = calculateHandValue(hand);
    let isStanding = false;

    while (!isStanding && score < 21) {
        const embed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${player.username}'s Turn`)
            .setDescription(`Your current hand: ${hand.join(' ')} (${score})`)
            .setFooter({ text: 'Please respond with "hit" or "stand" within 30 seconds.' });

        await message.channel.send({ embeds: [embed] });

        const filter = (response) => response.author.id === player.id && ['hit', 'stand'].includes(response.content.toLowerCase());
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });

        const action = collected.first().content.toLowerCase();
        if (action === 'hit') {
            const newCard = deck.pop();
            hand.push(newCard);
            score = calculateHandValue(hand);

            const hitEmbed = new Discord.EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${player.username}'s Turn`)
                .setDescription(`You drew a ${newCard}. Your new hand: ${hand.join(' ')} (${score})`);

            await message.channel.send({ embeds: [hitEmbed] });
        } else if (action === 'stand') {
            isStanding = true;

            const standEmbed = new Discord.EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${player.username}'s Turn`)
                .setDescription(`You choose to stand. Your final hand: ${hand.join(' ')} (${score})`);

            await message.channel.send({ embeds: [standEmbed] });
        }

        if (score > 21) {
            const bustEmbed = new Discord.EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${player.username}'s Turn`)
                .setDescription(`Bust! Your hand value exceeds 21.`);

            await message.channel.send({ embeds: [bustEmbed] });
        }
    }

    playerScores.set(player.id, score);
}

async function dealerTurn(message, dealerHand, deck) {
    let dealerScore = calculateHandValue(dealerHand);

    const initialEmbed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Dealer\'s Turn')
        .setDescription(`Dealer's initial hand: ${dealerHand.join(' ')} (${dealerScore})`);

    await message.channel.send({ embeds: [initialEmbed] });

    while (dealerScore < 17) {
        const newCard = deck.pop();
        dealerHand.push(newCard);
        dealerScore = calculateHandValue(dealerHand);

        const drawEmbed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Dealer\'s Turn')
            .setDescription(`Dealer draws a ${newCard}. Dealer's new hand: ${dealerHand.join(' ')} (${dealerScore})`);

        await message.channel.send({ embeds: [drawEmbed] });
    }

    if (dealerScore > 21) {
        const bustEmbed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Dealer\'s Turn')
            .setDescription(`Dealer busts with a hand value of ${dealerScore}!`);

        await message.channel.send({ embeds: [bustEmbed] });
    } else {
        const standEmbed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Dealer\'s Turn')
            .setDescription(`Dealer stands with a hand value of ${dealerScore}.`);

        await message.channel.send({ embeds: [standEmbed] });
    }
}

function determineWinners(playerScores, dealerHand) {
    const dealerScore = calculateHandValue(dealerHand);
    const winners = [];

    for (const [playerId, score] of playerScores.entries()) {
        if (score <= 21 && (score > dealerScore || dealerScore > 21)) {
            winners.push(playerId);
        }
    }

    return winners;
}

async function displayResults(message, winners) {
    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Game Results');

    if (winners.length === 0) {
        embed.setDescription('The dealer wins! Better luck next time.');
    } else {
        const winnerMentions = winners.map((winnerId) => `<@${winnerId}>`).join(', ');
        embed.setDescription(`Congratulations to the winners: ${winnerMentions}!`);
    }

    await message.channel.send({ embeds: [embed] });
}

module.exports = {
    startBlackjackGame,
};