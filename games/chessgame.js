const { Chess } = require('chess.js');
const generateChessboardImage = require('./chessboard.js');
const { MongoClient } = require('mongodb');
require('dotenv').config();


const mongo = new MongoClient(process.env.MONGO_URI);
const database = mongo.db('discordGameBot');
const chessGames = database.collection('Games');

const activeGames = new Map();
const drawOffers = new Map();
const promotionChoices = new Map();

async function startChessGame(message, participants) {
    const authorId = message.author.id;
    const opponentId = Array.from(participants.keys()).find(id => id !== authorId);
    const gameKey = `${authorId}-${opponentId}`;

    console.log(`Starting chess game with gameKey: ${gameKey}`);
    console.log(`Author ID: ${authorId}, Opponent ID: ${opponentId}`);

    if (await isPlayerInGame(authorId) || await isPlayerInGame(opponentId)) {
        console.log(`One or both players are already in a game. Author in game: ${await isPlayerInGame(authorId)}, Opponent in game: ${await isPlayerInGame(opponentId)}`);
        await message.channel.send('One or both players are already in a game.');
        return;
    }

    const chess = new Chess();
    activeGames.set(gameKey, chess);
    await chessGames.insertOne({ playerId: authorId, gameKey });
    await chessGames.insertOne({ playerId: opponentId, gameKey });

    console.log(`Active games: ${JSON.stringify([...activeGames.keys()])}`);
    console.log(`Player games: ${JSON.stringify(await getPlayerGames())}`);

    await message.channel.send(`Chess game started between <@${authorId}> (white) and <@${opponentId}> (black).`);
    await sendChessboardImage(message.channel, chess.board());
}

async function isPlayerInGame(playerId) {
    return !!(await chessGames.findOne({ playerId }));
}

async function getPlayerGameKey(playerId) {
    const game = await chessGames.findOne({ playerId });
    return game ? game.gameKey : null;
}

async function sendChessboardImage(channel, board, lastMove = null, flip = false) {
    try {
        await generateChessboardImage(board, lastMove, flip);
        await channel.send({ files: ['./chessboard.png'] });
    } catch (error) {
        console.error('Error generating or sending chessboard image:', error);
    }
}

async function makeMove(message, move, promotion = 'q') {
    try {
        const playerId = message.author.id;
        let gameKey = await getPlayerGameKey(playerId);

        console.log(`makeMove called with gameKey: ${gameKey}`);
        console.log(`Player ID: ${playerId}`);

        let chess = activeGames.get(gameKey);
        if (!chess) {
            const swappedGameKey = gameKey.split('-').reverse().join('-');
            chess = activeGames.get(swappedGameKey);
            if (chess) {
                console.log(`Game found with swappedGameKey: ${swappedGameKey}`);
                gameKey = swappedGameKey;
            } else {
                console.log(`No game found for gameKey: ${gameKey} or swappedGameKey: ${swappedGameKey}`);
                await message.channel.send('No game in progress.');
                return;
            }
        }

        const opponentId = gameKey.split('-').find(id => id !== playerId);
        const currentPlayerColor = chess.turn();
        const currentPlayerId = gameKey.split('-')[currentPlayerColor === 'w' ? 0 : 1];

        console.log(`Current player ID: ${currentPlayerId}, Current player color: ${currentPlayerColor}`);

        if (message.author.id !== currentPlayerId) {
            await message.channel.send('It is not your turn to make a move.');
            return;
        }

        const from = move.slice(0, 2);
        const to = move.slice(3, 5);

        
        const possibleMoves = chess.moves({ square: from, verbose: true });
        const isValidMove = possibleMoves.some(m => m.to === to);

        if (!isValidMove) {
            await message.channel.send('Invalid move. Please try again.');
            return;
        }

        const isPromotionMove = (from[1] === '7' && to[1] === '8' && currentPlayerColor === 'w') ||
            (from[1] === '2' && to[1] === '1' && currentPlayerColor === 'b');

        if (isPromotionMove && !promotionChoices.has(gameKey)) {
            
            promotionChoices.set(gameKey, { from, to });
            await message.channel.send(`<@${currentPlayerId}>, your pawn can be promoted! Please choose: Q (Queen), R (Rook), B (Bishop), N (Knight)`);
            return;
        }

        if (isPromotionMove && promotionChoices.has(gameKey)) {
            const choice = promotionChoices.get(gameKey).choice || promotion;
            if (!['q', 'r', 'b', 'n'].includes(choice)) {
                await message.channel.send(`<@${currentPlayerId}>, invalid choice! Please choose: Q (Queen), R (Rook), B (Bishop), N (Knight)`);
                return;
            }
            promotion = choice;
            promotionChoices.delete(gameKey);
        }

        const result = chess.move({ from, to, promotion });
        if (result) {
            await message.channel.send(`Move made: ${move}`);

            
            const previousImage = message.channel.messages.cache.find(msg => msg.attachments.first()?.url.includes('chessboard.png'));
            if (previousImage) {
                await previousImage.delete();
            }

            const flip = chess.turn() === 'b'; 
            await sendChessboardImage(message.channel, chess.board(), result, flip);

            if (chess.isCheckmate()) {
                await message.channel.send(`Checkmate! <@${currentPlayerId}> wins.`);
                await endChessGameByGameKey(gameKey);
            } else if (chess.isDraw()) {
                await message.channel.send('Draw!');
                await endChessGameByGameKey(gameKey);
            } else {
                const opponentId = gameKey.split('-').find(id => id !== currentPlayerId);
                let messageText = `It's now <@${opponentId}>'s turn.`;

                if (chess.isCheck()) {
                    messageText += ` <@${opponentId}>, your king is in check!`;
                }

                const moves = chess.moves({ verbose: true });
                const pinnedMoves = moves.filter(m => m.flags.includes('p'));

                if (pinnedMoves.length > 0) {
                    const pinnedPieces = pinnedMoves.map(m => m.piece).join(', ');
                    messageText += ` Some pieces (${pinnedPieces}) are pinned to protect the king.`;
                }

                await message.channel.send(messageText);
            }
        } else {
            await message.channel.send('Invalid move. Please try again.');
        }
    } catch (error) {
        console.error('Error making move:', error);
        await message.channel.send('An error occurred while processing your move.');
    }
}

async function endChessGameByGameKey(gameKey) {
    console.log(`Ending chess game with gameKey: ${gameKey}`);
    activeGames.delete(gameKey);
    drawOffers.delete(gameKey);
    promotionChoices.delete(gameKey);

    await chessGames.deleteMany({ gameKey });
}

async function endChessGame(message, participants) {
    const authorId = message.author.id;
    const opponentId = Array.from(participants.keys()).find(id => id !== authorId);
    const gameKey = `${authorId}-${opponentId}`;

    console.log(`Ending chess game with participants: ${authorId}, ${opponentId}`);

    await endChessGameByGameKey(gameKey);
    const swappedGameKey = gameKey.split('-').reverse().join('-');
    await endChessGameByGameKey(swappedGameKey);

    console.log(`Player games map after ending game: ${JSON.stringify(await getPlayerGames())}`);

    await message.channel.send('The chess game has been ended.');
}

async function resignGame(message) {
    const playerId = message.author.id;
    const gameKey = await getPlayerGameKey(playerId);

    console.log(`Resigning game for playerId: ${playerId}, gameKey: ${gameKey}`);

    if (!gameKey) {
        await message.channel.send('You are not currently in a game.');
        return;
    }

    const opponentId = gameKey.split('-').find(id => id !== playerId);
    await message.channel.send(`<@${playerId}> has resigned. <@${opponentId}> wins.`);
    await endChessGameByGameKey(gameKey);
}

async function proposeDraw(message) {
    const playerId = message.author.id;
    const gameKey = await getPlayerGameKey(playerId);

    console.log(`Proposing draw for playerId: ${playerId}, gameKey: ${gameKey}`);

    if (!gameKey) {
        await message.channel.send('You are not currently in a game.');
        return;
    }

    const opponentId = gameKey.split('-').find(id => id !== playerId);
    if (drawOffers.has(gameKey) && drawOffers.get(gameKey) === opponentId) {
        await message.channel.send(`Draw accepted by <@${opponentId}>. The game is a draw.`);
        await endChessGameByGameKey(gameKey);
    } else {
        drawOffers.set(gameKey, playerId);
        await message.channel.send(`<@${playerId}> has offered a draw. <@${opponentId}>, type !draw to accept.`);
    }
}

async function getPlayerGames() {
    const games = await chessGames.find().toArray();
    return games.reduce((map, game) => {
        map.set(game.playerId, game.gameKey);
        return map;
    }, new Map());
}

module.exports = {
    startChessGame,
    makeMove,
    endChessGame,
    resignGame,
    proposeDraw
};