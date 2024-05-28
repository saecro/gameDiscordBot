const { Chess } = require('chess.js');
const activeGames = new Map();

function startChessGame(message, participants) {
    const authorId = message.author.id;
    const opponentId = Array.from(participants.keys()).find(id => id !== authorId);
    const gameKey = `${authorId}-${opponentId}`;

    if (activeGames.has(gameKey)) {
        message.channel.send('A chess game is already in progress between you two.');
        return;
    }

    const chess = new Chess();
    activeGames.set(gameKey, chess);

    message.channel.send(`Chess game started between ${participants.get(authorId)} (white) and ${participants.get(opponentId)} (black).`);
    message.channel.send(`\`\`\`${getAsciiBoard(chess)}\`\`\``);
}

function makeMove(message, move, participants) {
    const authorId = message.author.id;
    const opponentId = Array.from(participants.keys()).find(id => id !== authorId);
    const gameKey = `${authorId}-${opponentId}`;
    const chess = activeGames.get(gameKey);

    if (!chess) {
        message.channel.send('No game in progress.');
        return;
    }

    const result = chess.move(move, { sloppy: true });

    if (result) {
        message.channel.send(`Move made: ${move}`);
        message.channel.send(`\`\`\`${getAsciiBoard(chess)}\`\`\``);

        if (chess.isCheckmate()) {
            message.channel.send(`Checkmate! ${message.author.username} wins.`);
            activeGames.delete(gameKey);
        } else if (chess.isStalemate()) {
            message.channel.send('Draw!');
            activeGames.delete(gameKey);
        } else {
            message.channel.send(`It's now ${participants.get(opponentId)}'s turn.`);
        }
    } else {
        message.channel.send('Invalid move. Try again.');
    }
}

function getAsciiBoard(chess) {
    const board = chess.board();
    const symbols = {
        p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔',
        P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
      };

    let ascii = ' a b c d e f g h\n';

    for (let row = 0; row < 8; row++) {
        ascii += (8 - row) + ' ';

        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const symbol = symbols[piece.color === 'w' ? piece.type.toUpperCase() : piece.type];
                ascii += symbol
            } else {
                ascii += '• ';
            }
        }

        ascii += (8 - row) + '\n';
    }

    ascii += ' a b c d e f g h\n';
    return ascii;
}

function endChessGame(message, participants) {
    const authorId = message.author.id;
    const opponentId = Array.from(participants.keys()).find(id => id !== authorId);
    const gameKey = `${authorId}-${opponentId}`;

    if (activeGames.has(gameKey)) {
        activeGames.delete(gameKey);
        message.channel.send('The chess game has been ended.');
    } else {
        message.channel.send('No game in progress.');
    }
}

module.exports = { startChessGame, makeMove, endChessGame };