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

async function generateChessboardImage(board, lastMove = null, flip = false) {
    const canvas = createCanvas((8 + 2) * squareSize, (8 + 2) * squareSize);
    const ctx = canvas.getContext('2d');

    // Define the colors for the chessboard squares
    const darkSquareColor = '#b88762';
    const lightSquareColor = '#edd6b0';
    const highlightDarkSquareColor = '#dcc34b';
    const highlightLightSquareColor = '#f6eb72';

    // Convert lastMove coordinates if flip is true
    let lastMoveFrom = lastMove ? lastMove.from : null;
    let lastMoveTo = lastMove ? lastMove.to : null;
    if (flip && lastMove) {
        lastMoveFrom = String.fromCharCode(104 - (lastMove.from.charCodeAt(0) - 97)) + (9 - parseInt(lastMove.from[1]));
        lastMoveTo = String.fromCharCode(104 - (lastMove.to.charCodeAt(0) - 97)) + (9 - parseInt(lastMove.to[1]));
    }

    // Draw the chessboard squares
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const drawX = flip ? 7 - x : x;
            const drawY = flip ? 7 - y : y;
            const coord = `${String.fromCharCode(97 + x)}${8 - y}`;
            const highlight = lastMove && (coord === lastMoveFrom || coord === lastMoveTo);
            ctx.fillStyle = highlight
                ? (drawX + drawY) % 2 === 0
                    ? highlightLightSquareColor
                    : highlightDarkSquareColor
                : (drawX + drawY) % 2 === 0
                    ? lightSquareColor
                    : darkSquareColor;
            ctx.fillRect((x + 1) * squareSize, (y + 1) * squareSize, squareSize, squareSize);
        }
    }

    // Draw white backgrounds for the letters and numbers
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 10 * squareSize, squareSize);
    ctx.fillRect(0, 9 * squareSize, 10 * squareSize, squareSize);
    ctx.fillRect(0, 0, squareSize, 10 * squareSize);
    ctx.fillRect(9 * squareSize, 0, squareSize, 10 * squareSize);

    // Draw the letters and numbers on the sides
    ctx.font = '40px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 8; i++) {
        ctx.fillText(String.fromCharCode(65 + i), ((flip ? 7 - i : i) + 1.5) * squareSize, (9.5) * squareSize);
        ctx.fillText(String.fromCharCode(65 + i), ((flip ? 7 - i : i) + 1.5) * squareSize, 0.5 * squareSize);
        ctx.fillText((8 - i).toString(), 0.5 * squareSize, ((flip ? 7 - i : i) + 1.5) * squareSize);
        ctx.fillText((8 - i).toString(), 9.5 * squareSize, ((flip ? 7 - i : i) + 1.5) * squareSize);
    }

    // Draw the pieces on the board
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const drawX = flip ? 7 - x : x;
            const drawY = flip ? 7 - y : y;
            const piece = board[y][x];
            let pieceKey;

            if (typeof piece === 'string') {
                pieceKey = piece;
            } else if (piece && typeof piece === 'object') {
                pieceKey = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
            }

            if (pieceKey && pieceImages[pieceKey]) {
                const imagePath = path.resolve(__dirname, '../pieces', pieceImages[pieceKey]);
                try {
                    const image = await loadImage(imagePath);
                    ctx.drawImage(image, (drawX + 1) * squareSize, (drawY + 1) * squareSize, squareSize, squareSize);
                } catch (error) {
                    console.error(`Error loading image for piece ${pieceKey} at ${imagePath}:`, error);
                }
            }
        }
    }
}

module.exports = generateChessboardImage;
