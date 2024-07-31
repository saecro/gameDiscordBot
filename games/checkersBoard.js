const { createCanvas } = require('canvas');

const pieceImages = {
    'r': 'redPiece.png',
    'R': 'redKing.png',
    'b': 'blackPiece.png',
    'B': 'blackKing.png',
};

const squareSize = 80;

async function generateCheckersboardImage(board, lastMove = null) {
    const canvas = createCanvas(8 * squareSize, 8 * squareSize);
    const ctx = canvas.getContext('2d');

    const darkSquareColor = '#b88762';
    const lightSquareColor = '#edd6b0';
    const highlightColor = '#a4d4ff';

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const isDarkSquare = (x + y) % 2 !== 0;
            ctx.fillStyle = isDarkSquare ? darkSquareColor : lightSquareColor;
            ctx.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
        }
    }

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const piece = board[y][x];
            if (piece) {
                const imagePath = path.resolve(__dirname, '../checkersPieces', pieceImages[piece]);
                try {
                    const image = await loadImage(imagePath);
                    ctx.drawImage(image, x * squareSize, y * squareSize, squareSize, squareSize);
                } catch (error) {
                    console.error(`Error loading image for piece ${piece} at ${imagePath}:`, error);
                }
            }
        }
    }

    const buffer = canvas.toBuffer('image/png');
    const base64Image = buffer.toString('base64');
    return base64Image;
}

module.exports = generateCheckersboardImage;