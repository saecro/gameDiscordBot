const { MongoClient } = require('mongodb');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const mongo = new MongoClient(process.env.MONGO_URI);
const database = mongo.db('discordGameBot');
const currencyCollection = database.collection('currency');
const shopItemsCollection = database.collection('shopItems');
const userItemsCollection = database.collection('userItems');

async function getOrCreateUserCurrency(userId) {
    let user = await currencyCollection.findOne({ discordID: userId });
    if (!user) {
        user = {
            discordID: userId,
            money: 100
        };
        await currencyCollection.insertOne(user);
    }
    return user.money;
}

async function updateUserCurrency(userId, amount) {
    await currencyCollection.updateOne({ discordID: userId }, { $inc: { money: amount } });
}

function createShopEmbed(items, index, total) {
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Shop Items')
        .setDescription('Here are the items available for purchase:')
        .setTimestamp()
        .setFooter({ text: `Page ${index + 1} of ${total}` });

    items.forEach(item => {
        embed.addFields({ name: `${item.emoji} ${item.name}`, value: `${item.description} - ${item.price} coins`, inline: true });
    });

    return embed;
}

async function listShopItems(message) {
    const items = await shopItemsCollection.find().toArray();

    if (items.length === 0) {
        return await message.channel.send('The shop is currently empty.');
    }

    const chunkSize = 25;
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }

    let currentIndex = 0;

    const shopEmbed = createShopEmbed(chunks[currentIndex], currentIndex, chunks.length);
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('←')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('→')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === chunks.length - 1)
        );

    const shopMessage = await message.channel.send({ embeds: [shopEmbed], components: [row] });

    const filter = i => i.user.id === message.author.id;
    const collector = shopMessage.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'prev' && currentIndex > 0) {
            currentIndex--;
        } else if (i.customId === 'next' && currentIndex < chunks.length - 1) {
            currentIndex++;
        }

        await i.update({
            embeds: [createShopEmbed(chunks[currentIndex], currentIndex, chunks.length)],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('←')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentIndex === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('→')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentIndex === chunks.length - 1)
                    )
            ]
        });
    });

    collector.on('end', collected => {
        shopMessage.edit({ components: [] });
    });
}

async function buyItem(message, itemName, quantity = 1) {
    const userId = message.author.id;
    const item = await shopItemsCollection.findOne({ name: new RegExp(`^${itemName}$`, 'i') });

    if (!item) {
        return await message.channel.send('This item does not exist.');
    }

    const userCurrency = await getOrCreateUserCurrency(userId);
    const totalCost = item.price * quantity;

    if (userCurrency < totalCost) {
        return await message.channel.send('You do not have enough coins to buy this quantity of the item.');
    }

    await updateUserCurrency(userId, -totalCost);

    const userItem = await userItemsCollection.findOne({ discordID: userId, itemName: item.name });
    if (userItem) {
        await userItemsCollection.updateOne(
            { discordID: userId, itemName: item.name },
            { $inc: { quantity: quantity } }
        );
    } else {
        await userItemsCollection.insertOne({
            discordID: userId,
            itemName: item.name,
            quantity: quantity
        });
    }

    await message.channel.send(`You have purchased ${quantity} ${item.name}(s) for ${totalCost} coins.`);
}

async function showInventory(message) {
    const userId = message.author.id;
    const userItems = await userItemsCollection.find({ discordID: userId }).toArray();

    if (userItems.length === 0) {
        return await message.channel.send('Your inventory is empty.');
    }

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`${message.author.username}'s Inventory`)
        .setDescription('Here are the items you own:')
        .setTimestamp();

    userItems.forEach(userItem => {
        embed.addFields({ name: userItem.itemName, value: `Quantity: ${userItem.quantity}`, inline: true });
    });

    await message.channel.send({ embeds: [embed] });
}

module.exports = {
    listShopItems,
    buyItem,
    showInventory
};