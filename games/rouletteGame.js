const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db, currencyCollection;

async function connectToDb() {
    try {
        await mongoClient.connect();
        db = mongoClient.db('discordGameBot');
        currencyCollection = db.collection('currency');
        console.log('Connected to database successfully.');
    } catch (error) {
        console.error('Error connecting to database:', error);
    }
}
connectToDb().catch(console.error);

async function getUserBalance(userId) {
    try {
        let user = await currencyCollection.findOne({ discordID: userId });
        if (!user) {
            user = { discordID: userId, money: 1000 };
            await currencyCollection.insertOne(user);
            console.log(`New user created with ID: ${userId} and initial balance of 1000.`);
        }
        console.log(`User ${userId} balance retrieved: ${user.money}`);
        return user.money;
    } catch (error) {
        console.error('Error getting user balance:', error);
    }
}

async function updateUserBalance(userId, amount) {
    try {
        await currencyCollection.updateOne({ discordID: userId }, { $set: { money: amount } });
        console.log(`User ${userId} balance updated to ${amount}.`);
    } catch (error) {
        console.error('Error updating user balance:', error);
    }
}

async function startRouletteGame(client, message) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Roulette Game')
            .setDescription('Please enter your stake amount:');

        await message.channel.send({ embeds: [embed] });
        console.log('Prompted user for stake amount.');

        const filter = response => response.author.id === message.author.id && /^\d+$/.test(response.content);
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });

        if (collected.size === 0) {
            await message.channel.send('You did not enter a valid stake amount in time.');
            console.log('User did not enter a valid stake amount in time.');
            return;
        }

        const betAmount = parseInt(collected.first().content);
        console.log(`User entered stake amount: ${betAmount}`);
        const userBalance = await getUserBalance(message.author.id);

        if (userBalance < betAmount) {
            await message.channel.send('You do not have enough balance to place this bet.');
            console.log('User does not have enough balance.');
            return;
        }

        const betEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Roulette Game')
            .setDescription('Place your bets!');

        const betOptions = [
            { label: 'Red', style: ButtonStyle.Danger },
            { label: 'Black', style: ButtonStyle.Secondary },
            { label: 'Odd', style: ButtonStyle.Primary },
            { label: 'Even', style: ButtonStyle.Success },
            { label: '1-18', style: ButtonStyle.Primary },
            { label: '19-36', style: ButtonStyle.Success },
            { label: 'Green', style: ButtonStyle.Success },
            { label: '1st Row', style: ButtonStyle.Secondary },
            { label: '2nd Row', style: ButtonStyle.Secondary },
            { label: '3rd Row', style: ButtonStyle.Secondary },
            { label: '1st Section', style: ButtonStyle.Secondary },
            { label: '2nd Section', style: ButtonStyle.Secondary },
            { label: '3rd Section', style: ButtonStyle.Secondary },
            { label: 'Number', style: ButtonStyle.Primary },
        ];

        const rows = [];
        for (let i = 0; i < betOptions.length; i += 5) {
            const row = new ActionRowBuilder().addComponents(
                betOptions.slice(i, i + 5).map(option =>
                    new ButtonBuilder()
                        .setCustomId(option.label)
                        .setLabel(option.label)
                        .setStyle(option.style)
                )
            );
            rows.push(row);
        }

        const sentMessage = await message.channel.send({ embeds: [betEmbed], components: rows });
        console.log('Sent bet options to user.');
        const buttonFilter = interaction => interaction.user.id === message.author.id;
        const collector = sentMessage.createMessageComponentCollector({ buttonFilter, time: 60000 });

        collector.on('collect', async interaction => {
            try {
                await interaction.deferUpdate();
                const betType = interaction.customId;
                console.log(`User selected bet type: ${betType}`);

                if (betType === 'Number') {
                    const modal = new ModalBuilder()
                        .setCustomId('numberBet')
                        .setTitle('Place Your Bet on a Number')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('numberInput')
                                    .setLabel('Enter a number between 0 and 36')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            )
                        );
                    await interaction.showModal(modal);
                    console.log('Prompted user to enter a number.');
                    return;
                }

                await processBet(interaction, betType, betAmount);
                collector.stop();
            } catch (error) {
                console.error('Error processing bet interaction:', error);
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                await message.channel.send('Time ran out! No bets were placed.');
                console.log('No bets were placed. Collector timed out.');
            }
        });

        client.on('interactionCreate', async interaction => {
            if (!interaction.isModalSubmit()) return;
            if (interaction.customId === 'numberBet') {
                try {
                    const betNumber = interaction.fields.getTextInputValue('numberInput');
                    if (isNaN(betNumber) || betNumber < 0 || betNumber > 36) {
                        await interaction.reply({ content: 'Invalid number! Please enter a number between 0 and 36.', ephemeral: true });
                        console.log('User entered an invalid number.');
                        return;
                    }
                    console.log(`User entered number bet: ${betNumber}`);
                    await processBet(interaction, `Number ${betNumber}`, betAmount);
                } catch (error) {
                    console.error('Error processing number bet:', error);
                }
            }
        });
    } catch (error) {
        console.error('Error starting roulette game:', error);
    }
}

async function processBet(interaction, betType, betAmount) {
    try {
        const userId = interaction.user.id;
        const userBalance = await getUserBalance(userId);

        const spinResult = Math.floor(Math.random() * 37); // Spin result (0-36)
        console.log(`Roulette spin result: ${spinResult}`);
        const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(spinResult);
        const isBlack = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35].includes(spinResult);
        const isOdd = spinResult % 2 !== 0;
        const isEven = spinResult % 2 === 0 && spinResult !== 0;
        const isLow = spinResult >= 1 && spinResult <= 18;
        const isHigh = spinResult >= 19 && spinResult <= 36;
        const isGreen = spinResult === 0;
        const isRow1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].includes(spinResult);
        const isRow2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].includes(spinResult);
        const isRow3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].includes(spinResult);
        const isSection1 = spinResult >= 1 && spinResult <= 12;
        const isSection2 = spinResult >= 13 && spinResult <= 24;
        const isSection3 = spinResult >= 25 && spinResult <= 36;

        console.log(`Bet type: ${betType}, isRed: ${isRed}, isBlack: ${isBlack}, isOdd: ${isOdd}, isEven: ${isEven}, isLow: ${isLow}, isHigh: ${isHigh}, isGreen: ${isGreen}, isRow1: ${isRow1}, isRow2: ${isRow2}, isRow3: ${isRow3}, isSection1: ${isSection1}, isSection2: ${isSection2}, isSection3: ${isSection3}`);

        let won = false;
        if ((betType === 'Red' && isRed) ||
            (betType === 'Black' && isBlack) ||
            (betType === 'Odd' && isOdd) ||
            (betType === 'Even' && isEven) ||
            (betType === '1-18' && isLow) ||
            (betType === '19-36' && isHigh) ||
            (betType === 'Green' && isGreen) ||
            (betType === '1st Row' && isRow1) ||
            (betType === '2nd Row' && isRow2) ||
            (betType === '3rd Row' && isRow3) ||
            (betType === '1st Section' && isSection1) ||
            (betType === '2nd Section' && isSection2) ||
            (betType === '3rd Section' && isSection3) ||
            (betType === `Number ${spinResult}`)) {
            won = true;
        }

        console.log(`User ${userId} bet result: ${won ? 'won' : 'lost'}`);
        const newBalance = won ? userBalance + betAmount : userBalance - betAmount;
        await updateUserBalance(userId, newBalance);

        const resultEmbed = new EmbedBuilder()
            .setColor(won ? '#00ff00' : '#ff0000')
            .setTitle('Roulette Result')
            .setDescription(`The ball landed on ${spinResult}. You ${won ? 'won' : 'lost'}! Your new balance is ${newBalance} coins.`);

        await interaction.followUp({ embeds: [resultEmbed] });
        console.log(`Bet result processed. User ${userId} ${won ? 'won' : 'lost'}. New balance: ${newBalance}`);
    } catch (error) {
        console.error('Error processing bet:', error);
    }
}

module.exports = { startRouletteGame };