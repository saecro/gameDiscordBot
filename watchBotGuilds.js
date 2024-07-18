const { MongoClient } = require('mongodb');
const { Server } = require('socket.io');
require('dotenv').config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

const startWatching = async (io) => {
    await mongoClient.connect();
    const db = mongoClient.db('gameDiscordBot');
    const collection = db.collection('botGuilds');

    const changeStream = collection.watch();

    changeStream.on('change', (change) => {
        console.log('Change detected:', change);
        io.emit('botGuildsUpdated', change);
    });

    console.log('Started watching botGuilds collection');
};

module.exports = startWatching;