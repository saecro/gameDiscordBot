const { Chess } = require('chess.js');
const { generateChessboardImage } = require('./chessboard.js');

const activeGames = new Map();

async function startChessGame(message, participants) {
    const authorId = message.author.id;
    const opponentId = Array.from(participants.keys()).find(id => id !== authorId);
    const gameKey = `${authorId}-${opponentId}`;

    if (activeGames.has(gameKey)) {
        message.channel.send('A chess game is already in progress between you two.');
        return;
    }

    const chess = new Chess();
    activeGames.set(gameKey, chess);

    message.channel.send(`Chess game started between <@${authorId}> (white) and <@${opponentId}> (black).`);
    await sendChessboardImage(message.channel, chess.board());
}
async function sendChessboardImage(channel, board, lastMove = null) {
    try {
        console.log('Generating chessboard image with the following board structure:');
        console.log(JSON.stringify(board, null, 2));
        await generateChessboardImage(board, lastMove);
        await channel.send({ files: ['./chessboard.png'] });
    } catch (error) {
        console.error('Error generating or sending chessboard image:', error);
    }
}
async function makeMove(message, move, gameKey) {
    const chess = activeGames.get(gameKey);
    if (!chess) {
        // Check if the game exists with swapped player IDs
        const swappedGameKey = gameKey.split('-').reverse().join('-');
        const swappedChess = activeGames.get(swappedGameKey);
        if (swappedChess) {
            gameKey = swappedGameKey;
            chess = swappedChess;
        } else {
            message.channel.send('No game in progress.');
            return;
        }
    }

    const currentPlayerColor = chess.turn();
    const currentPlayerId = gameKey.split('-')[currentPlayerColor === 'w' ? 0 : 1];

    if (message.author.id !== currentPlayerId) {
        message.channel.send('It is not your turn to make a move.');
        return;
    }

    const result = chess.move(move, { sloppy: true });
    if (result) {
        message.channel.send(`Move made: ${move}`);

        // Delete the previous image of the game
        const previousImage = message.channel.messages.cache.find(msg => msg.attachments.first()?.url.includes('chessboard.png'));
        if (previousImage) {
            await previousImage.delete();
        }

        await sendChessboardImage(message.channel, chess.board(), result);

        if (chess.isCheckmate()) {
            message.channel.send(`Checkmate! <@${currentPlayerId}> wins.`);
            activeGames.delete(gameKey);
        } else if (chess.isDraw()) {
            message.channel.send('Draw!');
            activeGames.delete(gameKey);
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

            message.channel.send(messageText);
        }
    } else {
        if (chess.isCheck()) {
            message.channel.send('Invalid move. Your king is in check! You must move out of check or block the check.');
        } else {
            const moves = chess.moves({ verbose: true });
            const pinnedMoves = moves.filter(m => m.flags.includes('p'));

            if (pinnedMoves.length > 0) {
                const pinnedPieces = pinnedMoves.map(m => m.piece).join(', ');
                message.channel.send(`Invalid move. Some pieces (${pinnedPieces}) are pinned to protect the king. You must move the pinned piece or block the check.`);
            } else {
                message.channel.send('Invalid move. Please try again.');
            }
        }
    }
}

function endChessGame(message, participants) {

    process.exit(0)
}

module.exports = {
    startChessGame,
    makeMove,
    endChessGame
};
