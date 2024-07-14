const { MongoClient } = require('mongodb');
const { EmbedBuilder } = require('discord.js');

const symbols = ["🍒", "🍋", "🍊", "🍉", "🍇", "🔔", "⭐"];
const symbolWeights = {
    "🍒": 0.4,
    "🍋": 0.25,
    "🍊": 0.15,
    "🍉": 0.1,
    "🍇": 0.05,
    "🔔": 0.03,
    "⭐": 0.02
};

const payouts = {
    "🍒🍒🍒": 10,
    "🍋🍋🍋": 15,
    "🍊🍊🍊": 20,
    "🍉🍉🍉": 25,
    "🍇🍇🍇": 30,
    "🔔🔔🔔": 50,
    "⭐⭐⭐": 100,
    "🍒🍒X": 2,
    "🍒X🍒": 2,
    "X🍒🍒": 2,
    "🍋🍋X": 3,
    "🍋X🍋": 3,
    "X🍋🍋": 3,
    "🍊🍊X": 5,
    "🍊X🍊": 5,
    "X🍊🍊": 5,
    "🍉🍉X": 6,
    "🍉X🍉": 6,
    "X🍉🍉": 6,
    "🍇🍇X": 7,
    "🍇X🍇": 7,
    "X🍇🍇": 7,
    "🔔🔔X": 8,
    "🔔X🔔": 8,
    "X🔔🔔": 8,
    "⭐⭐X": 9,
    "⭐X⭐": 9,
    "X⭐⭐": 9
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

    const resultString = result.join('');
    let payout = 0;

    if (payouts[resultString]) {
        payout = bet * payouts[resultString];
    } else if (payouts[`${result[0]}${result[1]}X`] || payouts[`X${result[0]}${result[1]}`] || payouts[`${result[0]}X${result[1]}`]) {
        payout = bet * (payouts[`${result[0]}${result[1]}X`] || payouts[`X${result[0]}${result[1]}`] || payouts[`${result[0]}X${result[1]}`]);
    }

    if (payout > 0) {
        const newAmount = userMoney + payout;
        await updateUserCurrency(userId, newAmount);
        embed.addFields({ name: 'Result', value: `Congratulations! You won ${payout} coins! Your new balance is ${newAmount}.` });
    } else {
        const newAmount = userMoney - bet;
        await updateUserCurrency(userId, newAmount);
        embed.addFields({ name: 'Result', value: `Sorry, you didn't win this time. Your new balance is ${newAmount}.` });
    }

    await message.channel.send({ embeds: [embed] });
}

module.exports = {
    slotMachineGame
};