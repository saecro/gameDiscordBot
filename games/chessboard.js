const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Paths to piece images
const pieceImages = {
    'P': 'white-pawn.png',
    'N': 'white-knight.png',
    'B': 'white-bishop.png',
    'R': 'white-rook.png',
    'Q': 'white-queen.png',
    'K': 'white-king.png',
    'p': 'black-pawn.png',
    'n': 'black-knight.png',
    'b': 'black-bishop.png',
    'r': 'black-rook.png',
    'q': 'black-queen.png',
    'k': 'black-king.png',
};

const squareSize = 80; // Size of each square on the board

async function generateChessboardImage(board, lastMove = null) {
    const canvas = createCanvas(8 * squareSize, 8 * squareSize);
    const ctx = canvas.getContext('2d');

    // Draw the chessboard squares
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            // Highlight the squares of the last move
            if (lastMove && (lastMove.from === `${String.fromCharCode(97 + x)}${8 - y}` || lastMove.to === `${String.fromCharCode(97 + x)}${8 - y}`)) {
                ctx.fillStyle = '#cdd26a';
            } else {
                ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#b58863';
            }
            ctx.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
        }
    }

    // Draw the pieces on the board
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const piece = board[y][x];
            let pieceKey;

            if (typeof piece === 'string') {
                pieceKey = piece;
            } else if (piece && typeof piece === 'object') {
                pieceKey = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
            }

            if (pieceKey && pieceImages[pieceKey]) {
                const imagePath = path.resolve(__dirname, '../pieces', pieceImages[pieceKey]);
                console.log(`Loading image for piece ${pieceKey}: ${imagePath}`);
                try {
                    const image = await loadImage(imagePath);
                    ctx.drawImage(image, x * squareSize, y * squareSize, squareSize, squareSize);
                } catch (error) {
                    console.error(`Error loading image for piece ${pieceKey} at ${imagePath}:`, error);
                }
            }
        }
    }

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./chessboard.png', buffer);
}

module.exports = { generateChessboardImage };
