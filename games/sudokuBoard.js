const { createCanvas } = require('canvas');

const cellSize = 60;

async function drawSudokuBoard(puzzle, highlightGrid = null, highlightCell = null, candidates = []) {
    const canvas = createCanvas(9 * cellSize, 9 * cellSize);
    const ctx = canvas.getContext('2d');

    const lightSquareColor = '#ffffff';
    const darkSquareColor = '#dddddd';
    const highlightColor = '#a4d4ff';
    const cellHighlightColor = '#4da6ff';

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const isDarkSquare = (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 0;
            ctx.fillStyle = isDarkSquare ? darkSquareColor : lightSquareColor;
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

            if (highlightGrid) {
                const [gridRow, gridCol] = highlightGrid;
                if (Math.floor(row / 3) === gridRow && Math.floor(col / 3) === gridCol) {
                    ctx.fillStyle = highlightColor;
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }

            if (highlightCell) {
                const [cellRow, cellCol] = highlightCell;
                if (row === cellRow && col === cellCol) {
                    ctx.fillStyle = cellHighlightColor;
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }

                // Highlight row and column
                if (row === cellRow || col === cellCol) {
                    ctx.fillStyle = highlightColor;
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }

                // Re-draw the cell itself with a different color to stand out
                if (row === cellRow && col === cellCol) {
                    ctx.fillStyle = cellHighlightColor;
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }

            const value = puzzle[row * 9 + col];
            if (value !== '-') {
                ctx.font = '40px Arial';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(value, col * cellSize + cellSize / 2, row * cellSize + cellSize / 2);
                console.log(`Drawing number ${value} at cell (${row}, ${col})`);
            }

            const cellCandidates = candidates[row * 9 + col];
            if (cellCandidates && cellCandidates.length > 0) {
                ctx.font = '12px Arial';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                cellCandidates.forEach(candidate => {
                    const candidateCol = (candidate - 1) % 3;
                    const candidateRow = Math.floor((candidate - 1) / 3);
                    ctx.fillText(candidate, col * cellSize + (candidateCol + 0.5) * (cellSize / 3), row * cellSize + (candidateRow + 0.5) * (cellSize / 3));
                });
                console.log(`Drawing candidates ${cellCandidates} at cell (${row}, ${col})`);
            }
        }
    }

    for (let i = 0; i <= 9; i++) {
        ctx.lineWidth = i % 3 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, 9 * cellSize);
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(9 * cellSize, i * cellSize);
        ctx.stroke();
    }

    return canvas.toBuffer();
}

module.exports = { drawSudokuBoard };