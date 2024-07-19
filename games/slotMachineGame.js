const { MongoClient } = require('mongodb');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

const symbols = ["🍒", "🍋", "🍊", "🍉", "🍇", "🔔", "⭐"];
const symbolWeights = {
    "🍒": 0.6,
    "🍋": 0.15,
    "🍊": 0.59,
    "🍉": 0.07,
    "🍇": 0.05,
    "🔔": 0.03,
    "⭐": 0.01
};

const payouts = {
    "🍒🍒🍒": 0.5,
    "🍋🍋🍋": 1,
    "🍊🍊🍊": 1.5,
    "🍉🍉🍉": 2,
    "🍇🍇🍇": 5,
    "🔔🔔🔔": 10,
    "⭐⭐⭐": 100,
    "🍒🍒X": 0,
    "🍒X🍒": 0,
    "X🍒🍒": 0,
    "🍋🍋X": 0.1,
    "🍋X🍋": 0.1,
    "X🍋🍋": 0.1,
    "🍊🍊X": 0.25,
    "🍊X🍊": 0.25,
    "X🍊🍊": 0.25,
    "🍉🍉X": 0.5,
    "🍉X🍉": 0.5,
    "X🍉🍉": 0.5,
    "🍇🍇X": 1,
    "🍇X🍇": 1,
    "X🍇🍇": 1,
    "🔔🔔X": 1.5,
    "🔔X🔔": 1.5,
    "X🔔🔔": 1.5,
    "⭐⭐X": 2,
    "⭐X⭐": 2,
    "X⭐⭐": 2
};

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
let db, currencyCollection;

async function connectToDb() {
    await client.connect();
    db = client.db('discordGameBot');
    currencyCollection = db.collection('currency');
}
connectToDb().catch(console.error);

async function getOrCreateUserCurrency(userId) {
    let user = await currencyCollection.findOne({ discordID: userId });
    if (!user) {
        user = { discordID: userId, money: 100 };
        await currencyCollection.insertOne(user);
    }
    return user.money;
}

async function updateUserCurrency(userId, newAmount) {
    await currencyCollection.updateOne({ discordID: userId }, { $set: { money: newAmount } });
}

function getRandomSymbol() {
    const rand = Math.random();
    let sum = 0;
    for (const symbol in symbolWeights) {
        sum += symbolWeights[symbol];
        if (rand < sum) {
            return symbol;
        }
    }
}

function spinSlotMachine() {
    return Array.from({ length: 3 }, getRandomSymbol);
}

function calculatePayout(result, bet) {
    const resultString = result.join('');
    let payout = 0;

    if (payouts[resultString]) {
        payout = bet * payouts[resultString];
    } else {
        // Check for two symbols and a wildcard match
        const possibleCombinations = [
            `${result[0]}${result[1]}X`,
            `${result[0]}X${result[1]}`,
            `X${result[0]}${result[1]}`,
            `${result[0]}X${result[2]}`,
            `X${result[0]}${result[2]}`,
            `${result[1]}X${result[2]}`,
            `X${result[1]}${result[2]}`
        ];
        for (const combo of possibleCombinations) {
            if (payouts[combo]) {
                payout = bet * payouts[combo];
                break;
            }
        }
    }

    return payout;
}

async function slotMachineGame(message, bet) {
    const userId = message.author.id;
    const userMoney = await getOrCreateUserCurrency(userId);

    if (bet > userMoney) {
        await message.channel.send('You do not have enough currency to place this bet.');
        return;
    }

    if (bet <= 0) {
        await message.channel.send('Please enter a valid bet amount greater than zero.');
        return;
    }

    const result = spinSlotMachine();
    const resultMessage = result.join(' | ');

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Slot Machine')
        .setDescription(`${message.author} spun the slot machine: ${resultMessage}`);

    const payout = calculatePayout(result, bet);

    let newAmount;
    let resultText;
    let gifPath;

    if (payout > bet) {
        newAmount = userMoney + payout;
        resultText = `Congratulations! You won ${payout} coins! Your new balance is ${newAmount}.`;
        gifPath = path.join(__dirname, '..', 'gifs', 'win.gif');
    } else {
        newAmount = userMoney - bet;
        resultText = `Sorry, you lost. You made ${payout}. Your new balance is ${newAmount}.`;
        gifPath = path.join(__dirname, '..', 'gifs', 'lose.gif');
    }

    await updateUserCurrency(userId, newAmount);

    const attachment = new AttachmentBuilder(gifPath);
    embed.addFields({ name: 'Result', value: resultText });
    embed.setImage(`attachment://${path.basename(gifPath)}`);

    await message.channel.send({ embeds: [embed], files: [attachment] });
}

module.exports = {
    slotMachineGame
};