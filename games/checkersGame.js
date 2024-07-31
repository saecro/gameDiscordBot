const generateCheckersboardImage = require('./checkersBoard.js');
const { MongoClient } = require('mongodb');
const { AttachmentBuilder } = require('discord.js');
require('dotenv').config();

const mongo = new MongoClient(process.env.MONGO_URI);
const database = mongo.db('discordGameBot');
const checkersGames = database.collection('Games');

const activeGames = new Map();

function setupInitialBoard() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 8; x++) {
            if ((x + y) % 2 !== 0) {
                board[y][x] = 'r';
            }
        }
    }
    for (let y = 5; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if ((x + y) % 2 !== 0) {
                board[y][x] = 'b';
            }
        }
    }
    return board;
}

async function startCheckersGame(message, participants) {
    const authorId = message.author.id;
    const opponentId = Array.from(participants.keys()).find(id => id !== authorId);
    const gameKey = `${authorId}-${opponentId}`;

    if (await isPlayerInGame(authorId) || await isPlayerInGame(opponentId)) {
        await message.channel.send('One or both players are already in a game.');
        return;
    }

    const board = setupInitialBoard();
    activeGames.set(gameKey, { board, turn: 'r' });
    await checkersGames.insertOne({ playerId: authorId, gameKey });
    await checkersGames.insertOne({ playerId: opponentId, gameKey });

    await message.channel.send(`Checkers game started between <@${authorId}> (red) and <@${opponentId}> (black).`);
    await sendCheckersboardImage(message.channel, board);
}

async function isPlayerInGame(playerId) {
    return !!(await checkersGames.findOne({ playerId }));
}

async function getPlayerGameKey(playerId) {
    const game = await checkersGames.findOne({ playerId });
    return game ? game.gameKey : null;
}

async function sendCheckersboardImage(channel, board, lastMove = null) {
    try {
        const base64Image = await generateCheckersboardImage(board, lastMove);
        const buffer = Buffer.from(base64Image, 'base64');
        const attachment = new AttachmentBuilder(buffer, 'checkersboard.png');
        await channel.send({ files: [attachment] });
    } catch (error) {
        console.error('Error generating or sending checkersboard image:', error);
    }
}

async function makeMove(message, from, to) {
    const playerId = message.author.id;
    const gameKey = await getPlayerGameKey(playerId);

    if (!gameKey) {
        await message.channel.send('No game in progress.');
        return;
    }

    const gameData = activeGames.get(gameKey);
    if (!gameData) {
        await message.channel.send('No game in progress.');
        return;
    }

    const { board, turn } = gameData;

    const [fromY, fromX] = [parseInt(from[1]), from.charCodeAt(0) - 97];
    const [toY, toX] = [parseInt(to[1]), to.charCodeAt(0) - 97];

    if (turn === 'r' && board[fromY][fromX] !== 'r' && board[fromY][fromX] !== 'R') {
        await message.channel.send('It is not your turn to make a move.');
        return;
    }
    if (turn === 'b' && board[fromY][fromX] !== 'b' && board[fromY][fromX] !== 'B') {
        await message.channel.send('It is not your turn to make a move.');
        return;
    }

    const isValidMove = validateMove(board, fromY, fromX, toY, toX, turn);
    if (!isValidMove) {
        await message.channel.send('Invalid move. Please try again.');
        return;
    }

    board[toY][toX] = board[fromY][fromX];
    board[fromY][fromX] = null;

    gameData.turn = turn === 'r' ? 'b' : 'r';
    activeGames.set(gameKey, gameData);
    await sendCheckersboardImage(message.channel, board);
}

function validateMove(board, fromY, fromX, toY, toX, turn) {
    // Implement checkers move validation logic here
    return true;
}

module.exports = {
    startCheckersGame,
    makeMove,
};