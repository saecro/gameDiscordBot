const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MongoClient } = require('mongodb');
require('dotenv').config();


const mongo = new MongoClient(process.env.MONGO_URI);
const database = mongo.db('discordGameBot');
const connect4Games = database.collection('Games');

const activeGames = new Map();
const COLUMN_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];
const PLAYER_COLORS = {
    red: ':red_square:',
    yellow: ':yellow_square:',
    empty: ':black_large_square:',
};

const ROWS = 6;
const COLUMNS = 7;

async function startConnect4Game(client, message, participants) {
    const authorId = message.author.id;
    const opponentId = Array.from(participants.keys()).find(id => id !== authorId);
    const gameKey = `${authorId}-${opponentId}`;

    if (await isPlayerInGame(authorId) || await isPlayerInGame(opponentId)) {
        await message.channel.send('One or both players are already in a game.');
        return;
    }

    const board = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(PLAYER_COLORS.empty));
    activeGames.set(gameKey, { board, currentPlayer: authorId, gameKey, players: [authorId, opponentId] });

    await connect4Games.insertOne({ playerId: authorId, gameKey });
    await connect4Games.insertOne({ playerId: opponentId, gameKey });

    await updateBoardMessage(client, message, board, authorId, opponentId);
}

async function isPlayerInGame(playerId) {
    return !!(await connect4Games.findOne({ playerId }));
}

async function updateBoardMessage(client, message, board, currentPlayer, opponentId, oldMessage = null) {
    const userId = currentPlayer;
    const user = await client.users.fetch(userId);
    const username = user.username;

    const boardString = board.map(row => row.join('')).join('\n');
    const embed = new EmbedBuilder()
        .setTitle('Connect 4')
        .setDescription(boardString)
        .setFooter({ text: `Current turn: ${username}` });

    const buttonRows = [];
    for (let i = 0; i < COLUMNS; i += 5) {
        const buttons = new ActionRowBuilder();
        for (let j = i; j < Math.min(i + 5, COLUMNS); j++) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`column_${j}`)
                    .setLabel(COLUMN_EMOJIS[j])
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(board[0][j] !== PLAYER_COLORS.empty)
            );
        }
        buttonRows.push(buttons);
    }

    if (oldMessage) {
        try {
            await oldMessage.delete();
        } catch (error) {
            console.error('Failed to delete old message:', error);
        }
    }

    const sentMessage = await message.channel.send({
        content: `<@${currentPlayer}>, it's your turn!`,
        embeds: [embed],
        components: buttonRows
    });

    const filter = i => i.user.id === currentPlayer;
    const collector = sentMessage.createMessageComponentCollector({ filter, time: 15000 });

    collector.on('collect', async interaction => {
        if (interaction.customId.startsWith('column_')) {
            const columnIndex = parseInt(interaction.customId.split('_')[1]);
            await makeMove(client, message, columnIndex, currentPlayer, sentMessage);
        }
        await interaction.deferUpdate();
    });

    collector.on('end', collected => {
        sentMessage.edit({ components: [] }).catch(console.error);
    });
}

async function makeMove(client, message, columnIndex, currentPlayer, oldMessage) {
    const playerId = currentPlayer;
    const gameKey = await getPlayerGameKey(playerId);
    const game = activeGames.get(gameKey);
    const { board, players } = game;

    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row][columnIndex] === PLAYER_COLORS.empty) {
            board[row][columnIndex] = players[0] === playerId ? PLAYER_COLORS.red : PLAYER_COLORS.yellow;
            break;
        }
    }

    const nextPlayer = players.find(id => id !== currentPlayer);
    game.currentPlayer = nextPlayer;
    activeGames.set(gameKey, game);

    await updateBoardMessage(client, message, board, nextPlayer, currentPlayer, oldMessage);

    if (checkWin(board)) {
        const winner = await client.users.fetch(currentPlayer);
        await endConnect4Game(message, players, `<@${winner.id}> wins!`);
        return;
    }

    if (board.flat().every(cell => cell !== PLAYER_COLORS.empty)) {
        await endConnect4Game(message, players, 'Draw!');
        return;
    }
}

async function getPlayerGameKey(playerId) {
    const game = await connect4Games.findOne({ playerId });
    return game ? game.gameKey : null;
}

function checkWin(board) {
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS - 3; col++) {
            if (board[row][col] !== PLAYER_COLORS.empty &&
                board[row][col] === board[row][col + 1] &&
                board[row][col] === board[row][col + 2] &&
                board[row][col] === board[row][col + 3]) {
                return true;
            }
        }
    }

    for (let row = 0; row < ROWS - 3; row++) {
        for (let col = 0; col < COLUMNS; col++) {
            if (board[row][col] !== PLAYER_COLORS.empty &&
                board[row][col] === board[row + 1][col] &&
                board[row][col] === board[row + 2][col] &&
                board[row][col] === board[row + 3][col]) {
                return true;
            }
        }
    }

    for (let row = 0; row < ROWS - 3; row++) {
        for (let col = 0; col < COLUMNS - 3; col++) {
            if (board[row][col] !== PLAYER_COLORS.empty &&
                board[row][col] === board[row + 1][col + 1] &&
                board[row][col] === board[row + 2][col + 2] &&
                board[row][col] === board[row + 3][col + 3]) {
                return true;
            }
        }
    }

    for (let row = 3; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS - 3; col++) {
            if (board[row][col] !== PLAYER_COLORS.empty &&
                board[row][col] === board[row - 1][col + 1] &&
                board[row][col] === board[row - 2][col + 2] &&
                board[row][col] === board[row - 3][col + 3]) {
                return true;
            }
        }
    }

    return false;
}

async function endConnect4Game(message, players, result) {
    const gameKey = `${players[0]}-${players[1]}`;
    await endConnect4GameByGameKey(gameKey)
    await message.channel.send(result);
}

async function resignGame(message) {
    const playerId = message.author.id;
    const gameKey = await getPlayerGameKey(playerId);

    if (!gameKey) {
        await message.channel.send('You are not currently in a Connect 4 game.');
        return;
    }

    const opponentId = gameKey.split('-').find(id => id !== playerId);
    await message.channel.send(`<@${playerId}> has resigned. <@${opponentId}> wins.`);
    await endConnect4GameByGameKey(gameKey);
}

async function endConnect4GameByGameKey(gameKey) {
    activeGames.delete(gameKey);
    await connect4Games.deleteMany({ gameKey });
}

module.exports = {
    startConnect4Game,
    makeMove,
    resignGame,
};