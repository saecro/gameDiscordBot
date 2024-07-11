const { MongoClient } = require('mongodb');
const { EmbedBuilder } = require('discord.js');

const symbols = ["🍒", "🍋", "🍊", "🍉", "🍇", "🔔", "⭐"];

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

function spinSlotMachine() {
    return Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
}

async function slotMachineGame(message, bet) {
    const userId = message.author.id;
    const userMoney = await getOrCreateUserCurrency(userId);

    if (bet > userMoney) {
        message.channel.send('You do not have enough currency to place this bet.');
        return;
    }

    if (bet <= 0) {
        message.channel.send('Please enter a valid bet amount greater than zero.');
        return;
    }

    const result = spinSlotMachine();
    const resultMessage = result.join(' | ');

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Slot Machine')
        .setDescription(`${message.author} spun the slot machine: ${resultMessage}`);

    if (result[0] === result[1] && result[1] === result[2]) {
        const payout = bet * 10; // Example payout for matching three symbols
        const newAmount = userMoney + payout;
        await updateUserCurrency(userId, newAmount);
        embed.addFields({ name: 'Result', value: `Congratulations! You won ${payout} virtual coins! Your new balance is ${newAmount}.` });
    } else {
        const newAmount = userMoney - bet;
        await updateUserCurrency(userId, newAmount);
        embed.addFields({ name: 'Result', value: `Sorry, you didn't win this time. Your new balance is ${newAmount}.` });
    }

    message.channel.send({ embeds: [embed] });
}

module.exports = {
    slotMachineGame
};