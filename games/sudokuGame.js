const { getSudoku } = require('sudoku-gen');
const { drawSudokuBoard } = require('./sudokuBoard');
const Discord = require('discord.js');
const fs = require('fs');

class SudokuGame {
    constructor() {
        this.currentGames = new Map();
    }

    async startGame(message, difficulty) {
        console.log(`[startGame] User ${message.author.id} is starting a game with difficulty ${difficulty}`);
        const userId = message.author.id;
        const currentGame = getSudoku(difficulty);
        const predefinedNumbers = currentGame.puzzle
            .split('')
            .map((char, index) => (char !== '-' ? index : null))
            .filter((index) => index !== null);
        const candidates = Array(81).fill(null).map(() => []);
        this.currentGames.set(userId, { game: currentGame, highlightGrid: null, highlightCell: null, messageId: null, candidates, predefinedNumbers });

        await this.sendBoard(message);
    }

    async sendBoard(context) {
        const userId = context.author ? context.author.id : context.user.id;
        const gameData = this.currentGames.get(userId);
        if (!gameData) {
            console.log(`[sendBoard] No game data found for user ${userId}`);
            return;
        }

        console.log(`[sendBoard] Sending board for user ${userId}`);
        const { game, highlightGrid, highlightCell, messageId, candidates, predefinedNumbers } = gameData;
        console.log(`[sendBoard] Current puzzle: ${game.puzzle}`);
        console.log(`[sendBoard] Current candidates:`, candidates);

        const boardBuffer = await drawSudokuBoard(game.puzzle, highlightGrid, highlightCell, candidates, predefinedNumbers);

        if (messageId) {
            const previousMessage = await context.channel.messages.fetch(messageId).catch(() => null);
            if (previousMessage) {
                previousMessage.delete().catch(() => null);
                console.log(`[sendBoard] Deleted previous message for user ${userId}`);
            }
        }

        const attachment = new Discord.AttachmentBuilder(boardBuffer, { name: 'sudoku.png' });
        const sentMessage = await context.channel.send({ content: 'Sudoku Puzzle:', files: [attachment], components: this.getComponents(userId, gameData) });

        this.currentGames.set(userId, { ...gameData, messageId: sentMessage.id });
        console.log(`[sendBoard] Sent new board for user ${userId}`);
    }

    getComponents(userId, gameData) {
        console.log(`[getComponents] Generating components for user ${userId}`);
        const buttons = [];

        if (!gameData.highlightGrid) {
            for (let i = 0; i < 9; i++) {
                buttons.push(new Discord.ButtonBuilder()
                    .setCustomId(`grid_${userId}_${i}`)
                    .setLabel(`${i + 1}`)
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(false));
            }
            const row1 = new Discord.ActionRowBuilder().addComponents(buttons.slice(0, 3));
            const row2 = new Discord.ActionRowBuilder().addComponents(buttons.slice(3, 6));
            const row3 = new Discord.ActionRowBuilder().addComponents(buttons.slice(6, 9));
            const completeButton = new Discord.ButtonBuilder()
                .setCustomId(`complete_${userId}`)
                .setLabel('Complete')
                .setStyle(Discord.ButtonStyle.Success)
                .setDisabled(false);
            const giveUpButton = new Discord.ButtonBuilder()
                .setCustomId(`giveup_${userId}`)
                .setLabel('Give Up')
                .setStyle(Discord.ButtonStyle.Danger)
                .setDisabled(false);
            const row4 = new Discord.ActionRowBuilder().addComponents(completeButton, giveUpButton);
            return [row1, row2, row3, row4];
        } else if (!gameData.highlightCell) {
            const [gridRow, gridCol] = gameData.highlightGrid;
            const disablePositions = new Set();

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const cellIndex = (gridRow * 3 + i) * 9 + (gridCol * 3 + j);
                    const value = gameData.game.puzzle[cellIndex];
                    if (value !== '-') {
                        disablePositions.add(i * 3 + j);
                    }
                }
            }

            for (let i = 0; i < 9; i++) {
                buttons.push(new Discord.ButtonBuilder()
                    .setCustomId(`cell_${userId}_${i}`)
                    .setLabel(`${i + 1}`)
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(disablePositions.has(i)));
            }
            const row1 = new Discord.ActionRowBuilder().addComponents(buttons.slice(0, 3));
            const row2 = new Discord.ActionRowBuilder().addComponents(buttons.slice(3, 6));
            const row3 = new Discord.ActionRowBuilder().addComponents(buttons.slice(6, 9));
            const returnButton = new Discord.ButtonBuilder()
                .setCustomId(`return_${userId}_grid`)
                .setLabel('Return')
                .setStyle(Discord.ButtonStyle.Danger)
                .setDisabled(false);
            const row4 = new Discord.ActionRowBuilder().addComponents(returnButton);
            return [row1, row2, row3, row4];
        } else if (gameData.showAssignCandidates === 'assign') {
            const numberButtons = [];
            for (let i = 1; i <= 9; i++) {
                numberButtons.push(new Discord.ButtonBuilder()
                    .setCustomId(`assign_${userId}_${i}`)
                    .setLabel(`${i}`)
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(false));
            }
            const row1 = new Discord.ActionRowBuilder().addComponents(numberButtons.slice(0, 3));
            const row2 = new Discord.ActionRowBuilder().addComponents(numberButtons.slice(3, 6));
            const row3 = new Discord.ActionRowBuilder().addComponents(numberButtons.slice(6, 9));
            const backButton = new Discord.ButtonBuilder()
                .setCustomId(`back_${userId}`)
                .setLabel('Back')
                .setStyle(Discord.ButtonStyle.Danger)
                .setDisabled(false);
            const row4 = new Discord.ActionRowBuilder().addComponents(backButton);
            return [row1, row2, row3, row4];
        } else if (gameData.showAssignCandidates === 'candidates') {
            const numberButtons = [];
            for (let i = 1; i <= 9; i++) {
                numberButtons.push(new Discord.ButtonBuilder()
                    .setCustomId(`candidates_${userId}_${i}`)
                    .setLabel(`${i}`)
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(false));
            }
            const row1 = new Discord.ActionRowBuilder().addComponents(numberButtons.slice(0, 3));
            const row2 = new Discord.ActionRowBuilder().addComponents(numberButtons.slice(3, 6));
            const row3 = new Discord.ActionRowBuilder().addComponents(numberButtons.slice(6, 9));
            const backButton = new Discord.ButtonBuilder()
                .setCustomId(`back_${userId}`)
                .setLabel('Back')
                .setStyle(Discord.ButtonStyle.Danger)
                .setDisabled(false);
            const row4 = new Discord.ActionRowBuilder().addComponents(backButton);
            return [row1, row2, row3, row4];
        } else {
            const assignButton = new Discord.ButtonBuilder()
                .setCustomId(`assign_${userId}`)
                .setLabel('Assign')
                .setStyle(Discord.ButtonStyle.Primary)
                .setDisabled(false);
            const candidatesButton = new Discord.ButtonBuilder()
                .setCustomId(`candidates_${userId}`)
                .setLabel('Candidates')
                .setStyle(Discord.ButtonStyle.Primary)
                .setDisabled(false);
            const returnButton = new Discord.ButtonBuilder()
                .setCustomId(`return_${userId}_cell`)
                .setLabel('Return')
                .setStyle(Discord.ButtonStyle.Danger)
                .setDisabled(false);
            const row1 = new Discord.ActionRowBuilder().addComponents(assignButton, candidatesButton);
            const row2 = new Discord.ActionRowBuilder().addComponents(returnButton);
            return [row1, row2];
        }
    }

    async handleInteraction(interaction) {
        console.log(`[handleInteraction] Interaction received with customId: ${interaction.customId}`);
        if (!interaction.isButton()) {
            console.log(`[handleInteraction] Interaction is not a button`);
            return;
        }

        const [type, userId, index] = interaction.customId.split('_');
        console.log(`[handleInteraction] Parsed customId: type=${type}, userId=${userId}, index=${index}`);

        if (interaction.user.id !== userId) {
            console.log(`[handleInteraction] Interaction user ID ${interaction.user.id} does not match game owner ID ${userId}`);
            return interaction.reply({ content: "This is not your game!", ephemeral: true });
        }

        const gameData = this.currentGames.get(userId);
        if (!gameData) {
            console.log(`[handleInteraction] No game data found for user ${userId}`);
            return;
        }

        await interaction.deferUpdate(); // Defer the interaction

        console.log(`[handleInteraction] Handling button press for user ${userId}, type=${type}, index=${index}`);
        if (type === 'grid') {
            gameData.highlightGrid = [Math.floor(index / 3), index % 3];
            gameData.highlightCell = null;
            console.log(`[handleInteraction] Updated highlightGrid to ${gameData.highlightGrid}`);
        } else if (type === 'cell') {
            if (gameData.highlightGrid) {
                const gridRow = gameData.highlightGrid[0] * 3;
                const gridCol = gameData.highlightGrid[1] * 3;
                const cellRow = Math.floor(index / 3);
                const cellCol = index % 3;
                gameData.highlightCell = [gridRow + cellRow, gridCol + cellCol];
                console.log(`[handleInteraction] Updated highlightCell to ${gameData.highlightCell}`);
            }
        } else if (type === 'return') {
            if (index === 'cell') {
                gameData.highlightCell = null;
                console.log(`[handleInteraction] Cleared highlightCell`);
            } else {
                gameData.highlightGrid = null;
                gameData.highlightCell = null;
                console.log(`[handleInteraction] Cleared highlightGrid and highlightCell`);
            }
        } else if (type === 'assign') {
            if (index === undefined) {
                gameData.showAssignCandidates = 'assign';
            } else {
                const cellIndex = gameData.highlightCell[0] * 9 + gameData.highlightCell[1];
                gameData.game.puzzle = gameData.game.puzzle.substr(0, cellIndex) + index + gameData.game.puzzle.substr(cellIndex + 1);
                console.log(`[handleInteraction] Assigned value ${index} to cell ${cellIndex}`);

                // Clear candidates for the cell
                gameData.candidates[cellIndex] = [];

                gameData.highlightGrid = null;
                gameData.highlightCell = null;
                gameData.showAssignCandidates = null;
            }
        } else if (type === 'candidates') {
            if (index === undefined) {
                gameData.showAssignCandidates = 'candidates';
            } else {
                const cellIndex = gameData.highlightCell[0] * 9 + gameData.highlightCell[1];
                if (!gameData.candidates[cellIndex]) {
                    gameData.candidates[cellIndex] = [];
                }
                const cellCandidates = gameData.candidates[cellIndex];
                const candidateIndex = cellCandidates.indexOf(parseInt(index));
                if (candidateIndex >= 0) {
                    cellCandidates.splice(candidateIndex, 1);
                    console.log(`[handleInteraction] Removed candidate ${index} from cell ${cellIndex}`);
                } else {
                    cellCandidates.push(parseInt(index));
                    console.log(`[handleInteraction] Added candidate ${index} to cell ${cellIndex}`);
                }
            }
        } else if (type === 'complete') {
            const puzzle = gameData.game.puzzle;
            const solution = gameData.game.solution;
            console.log(puzzle)
            console.log(solution)
            if (puzzle === solution) {
                await interaction.channel.send({ content: 'Congratulations! You have completed the puzzle correctly.' });
                this.currentGames.delete(userId);
                return; // Exit early to avoid sending another board
            } else {
                await interaction.channel.send({ content: 'The puzzle is not yet solved correctly. Please keep trying!' });
            }
        } else if (type === 'giveup') {
            await interaction.channel.send({ content: 'You have given up on this puzzle. Better luck next time!' });
            this.currentGames.delete(userId);
            return; // Exit early to avoid sending another board
        } else if (type === 'back') {
            gameData.showAssignCandidates = null;
            console.log(`[handleInteraction] Cleared showAssignCandidates`);
        }

        this.currentGames.set(userId, gameData);
        await this.sendBoard(interaction);
        console.log(`[handleInteraction] Interaction handling complete for user ${userId}`);
    }
}

module.exports = new SudokuGame();