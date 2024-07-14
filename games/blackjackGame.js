const Discord = require('discord.js');
const { MongoClient } = require('mongodb');

const suits = ['♠️', '♥️', '♣️', '♦️'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
let db, currencyCollection;

async function getUserCurrency(userId) {
    let user = await currencyCollection.findOne({ discordID: userId });
    return user.money;
}

async function askForStake(message, player, playerScores, playerStakes) {
    const initialEmbed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${player.username}, place your stake`)
        .setDescription(`You have ${playerScores.get(player.id).money} coins. Please enter your stake (a positive integer).`);

    await message.channel.send({ embeds: [initialEmbed] });

    const filter = (response) => response.author.id === player.id && !isNaN(response.content) && parseInt(response.content) > 0 && parseInt(response.content) <= playerScores.get(player.id).money;
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);

    if (collected) {
        const stake = parseInt(collected.first().content);
        playerStakes.set(player.id, stake);

        const confirmEmbed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${player.username}, your stake is set`)
            .setDescription(`You have staked ${stake} coins.`);

        await message.channel.send({ embeds: [confirmEmbed] });
    } else {
        const timeoutEmbed = new Discord.EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`${player.username}, you took too long`)
            .setDescription('You did not enter a valid stake in time.');

        await message.channel.send({ embeds: [timeoutEmbed] });
        throw new Error(`Player ${player.username} did not enter a valid stake in time.`);
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function createDeck() {
    const deck = [];
    for (let i = 0; i < suits.length; i++) {
        for (let j = 0; j < values.length; j++) {
            deck.push(`${values[j]}${suits[i]}`);
        }
    }
    return shuffle(deck);
}

function calculateHandValue(hand) {
    let value = 0;
    let aceCount = 0;

    for (const card of hand) {
        const cardValue = card.slice(0, -2); 
        if (cardValue === 'A') {
            aceCount += 1;
            value += 11;
        } else if (['K', 'Q', 'J'].includes(cardValue)) {
            value += 10;
        } else {
            value += parseInt(cardValue);
        }
    }

    
    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount -= 1;
    }

    return value;
}

async function connectToDb() {
    await client.connect();
    db = client.db('discordGameBot');
    currencyCollection = db.collection('currency');
}
connectToDb().catch(console.error);

let gameState = {};
let lastMessageWithButtons = null;

const checkRunning = (channelId) => {
    return gameState[channelId]?.running;
};

async function startBlackjackGame(message, participants) {
    gameState[message.channel.id] = {
        running: true,
        participants
    };

    const players = Array.from(participants.keys());
    const playerHands = new Map();
    const playerScores = new Map();
    const playerStakes = new Map();
    const dealerHand = [];

    
    for (const playerId of players) {
        const initialMoney = await getUserCurrency(playerId);
        if (initialMoney > 0) {
            playerScores.set(playerId, { score: 0, money: initialMoney });
        } else {
            const player = await message.client.users.fetch(playerId);
            await message.channel.send(`${player.username}, you have been disqualified due to insufficient balance.`);
        }
    }

    if (playerScores.size === 0) {
        await message.channel.send('No players have sufficient balance to play.');
        return;
    }

    
    for (const playerId of playerScores.keys()) {
        const player = await message.client.users.fetch(playerId);
        await askForStake(message, player, playerScores, playerStakes);
    }

    const deck = createDeck();

    for (const playerId of playerScores.keys()) {
        const hand = [deck.pop(), deck.pop()];
        playerHands.set(playerId, hand);
        playerScores.set(playerId, { ...playerScores.get(playerId), score: calculateHandValue(hand) });
    }
    dealerHand.push(deck.pop(), deck.pop());

    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Blackjack Game')
        .setDescription('The game has started! Here are the initial hands:')
        .addFields(
            { name: 'Dealer', value: `${dealerHand[0]} ?` }
        );

    for (const [playerId, hand] of playerHands.entries()) {
        const player = await message.client.users.fetch(playerId);
        embed.addFields({ name: player.username, value: `${hand.join(' ')} (${calculateHandValue(hand)})` });
    }

    await message.channel.send({ embeds: [embed] });

    for (const playerId of playerScores.keys()) {
        if (!checkRunning(message.channel.id)) return; 
        const player = await message.client.users.fetch(playerId);
        await playerTurn(message, player, playerHands, playerScores, playerStakes, deck);
    }

    if (!checkRunning(message.channel.id)) return; 
    await dealerTurn(message, dealerHand, deck);

    if (!checkRunning(message.channel.id)) return; 
    const winners = determineWinners(playerScores, dealerHand);
    await displayResults(message, winners, playerScores, playerStakes);
}

async function playerTurn(message, player, playerHands, playerScores, playerStakes, deck) {
    const hand = playerHands.get(player.id);
    let { score, money } = playerScores.get(player.id);
    let isStanding = false;

    while (!isStanding && score < 21 && checkRunning(message.channel.id)) {
        const turnEmbed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${player.username}'s Turn`)
            .setDescription(`Your current hand: ${hand.join(' ')} (${score})`);

        const row = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId('hit')
                    .setLabel('Hit')
                    .setStyle(Discord.ButtonStyle.Primary),
                new Discord.ButtonBuilder()
                    .setCustomId('stand')
                    .setLabel('Stand')
                    .setStyle(Discord.ButtonStyle.Secondary)
            );

        lastMessageWithButtons = await message.channel.send({ embeds: [turnEmbed], components: [row] });

        const filter = (interaction) => interaction.user.id === player.id && ['hit', 'stand'].includes(interaction.customId);
        try {
            const collected = await lastMessageWithButtons.awaitMessageComponent({ filter, componentType: Discord.ComponentType.Button, time: 30000 });

            if (!checkRunning(message.channel.id)) return; 
            await collected.deferUpdate(); 

            const action = collected.customId;
            if (action === 'hit') {
                const newCard = deck.pop();
                hand.push(newCard);
                score = calculateHandValue(hand);

                const hitEmbed = new Discord.EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`${player.username}'s Turn`)
                    .setDescription(`You drew a ${newCard}. Your new hand: ${hand.join(' ')} (${score})`);

                await collected.editReply({ embeds: [hitEmbed], components: [] });
            } else if (action === 'stand') {
                isStanding = true;

                const standEmbed = new Discord.EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`${player.username}'s Turn`)
                    .setDescription(`You choose to stand. Your final hand: ${hand.join(' ')} (${score})`);

                await collected.editReply({ embeds: [standEmbed], components: [] });
            }

            if (score > 21) {
                const bustEmbed = new Discord.EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`${player.username}'s Turn`)
                    .setDescription(`Bust! Your hand value exceeds 21.`);

                await collected.editReply({ embeds: [bustEmbed], components: [] });
                isStanding = true;
            }
        } catch (error) {
            
            if (!checkRunning(message.channel.id)) return; 
            await lastMessageWithButtons.edit({ components: [] });
            const timeoutEmbed = new Discord.EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(`${player.username}'s Turn`)
                .setDescription(`You took too long to respond. Your turn has ended.`);

            await message.channel.send({ embeds: [timeoutEmbed] });
            isStanding = true; 
        }
    }

    playerScores.set(player.id, { score, money });
}

async function dealerTurn(message, dealerHand, deck) {
    let dealerScore = calculateHandValue(dealerHand);

    const initialDealerEmbed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Dealer\'s Turn')
        .setDescription(`Dealer's initial hand: ${dealerHand.join(' ')} (${dealerScore})`);

    await message.channel.send({ embeds: [initialDealerEmbed] });

    while (dealerScore < 17 && checkRunning(message.channel.id)) {
        const newCard = deck.pop();
        dealerHand.push(newCard);
        dealerScore = calculateHandValue(dealerHand);

        const drawEmbed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Dealer\'s Turn')
            .setDescription(`Dealer draws a ${newCard}. Dealer's new hand: ${dealerHand.join(' ')} (${dealerScore})`);

        await message.channel.send({ embeds: [drawEmbed] });
    }

    if (!checkRunning(message.channel.id)) return; 

    if (dealerScore > 21) {
        const bustEmbed = new Discord.EmbedBuilder()
            .setColor('#ff0000')
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

    for (const [playerId, { score }] of playerScores.entries()) {
        if (score <= 21 && (score > dealerScore || dealerScore > 21)) {
            winners.push(playerId);
        }
    }

    return winners;
}

async function displayResults(message, winners, playerScores, playerStakes) {
    const resultsEmbed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Game Results');

    if (winners.length === 0) {
        resultsEmbed.setDescription('The dealer wins! Better luck next time.');
    } else {
        const winnerMentions = winners.map((winnerId) => `<@${winnerId}>`).join(', ');
        resultsEmbed.setDescription(`Congratulations to the winners: ${winnerMentions}!`);
    }

    if (!checkRunning(message.channel.id)) return; 
    await message.channel.send({ embeds: [resultsEmbed] });

    
    for (const winnerId of winners) {
        const playerMoney = await getUserCurrency(winnerId);
        const stake = playerStakes.get(winnerId);
        const newAmount = Number(playerMoney) + stake; 
        await updateUserCurrency(winnerId, newAmount);
    }

    
    for (const [playerId, { score }] of playerScores.entries()) {
        if (!winners.includes(playerId)) {
            const playerMoney = await getUserCurrency(playerId);
            const stake = playerStakes.get(playerId);
            const newAmount = Number(playerMoney) - stake; 
            await updateUserCurrency(playerId, newAmount);
        }
    }
}

async function endBlackjackGame(message) {
    if (gameState[message.channel.id]) {
        gameState[message.channel.id].running = false;

        
        if (lastMessageWithButtons) {
            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.ButtonBuilder()
                        .setCustomId('hit')
                        .setLabel('Hit')
                        .setStyle(Discord.ButtonStyle.Primary)
                        .setDisabled(true),
                    new Discord.ButtonBuilder()
                        .setCustomId('stand')
                        .setLabel('Stand')
                        .setStyle(Discord.ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            await lastMessageWithButtons.edit({ components: [row] });
        }

        delete gameState[message.channel.id];
        await message.channel.send('You have exited the game.');
        console.log(`Blackjack game in channel ${message.channel.id} has been ended.`);
    } else {
        await message.channel.send('No blackjack game is currently running.');
    }
}

module.exports = { startBlackjackGame, endBlackjackGame };