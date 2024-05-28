const Discord = require('discord.js');
const quizGame = require('./games/quiz.js');
const mathGame = require('./games/mathGame.js');
const wordGame = require('./games/wordGame.js');
const hangMan = require('./games/hangMan.js');
const chessGame = require('./games/chessgame.js');
require('dotenv').config();

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMessageReactions,
    ]
});

client.once('ready', () => {
    let personalChannel = client.channels.cache.get('1093132638899949619');
    console.log(`Logged in as ${client.user.tag}!`);
    personalChannel.send('Bot is Online!');
    client.user.setActivity('the chance to have sex with groundshock', { type: Discord.ActivityType.Competing });
});

const UserIDs = [
    879824223365918771, // flacko
    1108312992946323476, // dodo
    599266518517415947, // groundshock
    805009105855971329, // saecro
    646715443004047373, // gojo
    1062092543229181962, // ranger
    921207090289180703, // saint
    841947091748257792, // nayan
];

let currentGame = null;

client.on('messageCreate', message => {
    if (UserIDs.includes(parseFloat(message.author.id))) {
        message.react('💀').catch(console.error);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/g);
    const command = args[0].toLowerCase();

    if (command === '!exitgame') {
        if (currentGame) {
            currentGame.endGame();
            currentGame = null;
            message.channel.send('The current game has been ended.');
        } else {
            message.channel.send('No game is currently running.');
        }
        return;
    }

    if (currentGame && command !== '!move' && command.startsWith('!start')) {
        message.channel.send('A game is already in progress. Please wait for it to finish before starting a new one.');
        return;
    }

    if (command === '!startquiz') {
        currentGame = new GameSession('quiz', message);
        await currentGame.start();
    } else if (command === '!startwordgame') {
        currentGame = new GameSession('wordgame', message);
        await currentGame.start();
    } else if (command === '!startmathgame') {
        currentGame = new GameSession('mathgame', message);
        await currentGame.start();
    } else if (command === '!starthangman') {
        currentGame = new GameSession('hangman', message);
        await currentGame.start();
    } else if (command === '!startchessgame') {
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
            return message.channel.send('Please mention a user to start a chess game with.');
        }

        if (mentionedUser.bot) {
            return message.channel.send('You cannot play chess with a bot.');
        }

        if (mentionedUser.id === message.author.id) {
            return message.channel.send('You cannot play chess with yourself.');
        }

        const participants = new Map();
        participants.set(message.author.id, message.author.username);
        participants.set(mentionedUser.id, mentionedUser.username);

        currentGame = new GameSession('chessgame', message, participants);
        await currentGame.start();
    } else if (command === '!move') {
        const from = args[1];
        const to = args[2];
        if (!from || !to) {
            return message.channel.send('Please provide a move in the format: !move <from> <to>. Example: !move e2 e4');
        }
        if (currentGame && currentGame.gameType === 'chessgame') {
            await currentGame.makeMove(message, from, to);
        } else {
            message.channel.send('No chess game in progress.');
        }
    }
});

class GameSession {
    constructor(gameType, message, participants = null) {
        this.gameType = gameType;
        this.message = message;
        this.participants = participants || new Map();
    }

    async start() {
        if (this.gameType !== 'chessgame') {
            this.participants = await startJoinPhase(this.message);
        }
        if (this.participants.size > 0) {
            this.startGame();
        } else {
            this.message.channel.send('No one joined the game.');
            currentGame = null;
        }
    }

    startGame() {
        if (this.gameType === 'quiz') {
            startQuizGame(this.message, this.participants);
        } else if (this.gameType === 'wordgame') {
            startWordGame(this.message, this.participants);
        } else if (this.gameType === 'mathgame') {
            startMathGame(this.message, this.participants);
        } else if (this.gameType === 'hangman') {
            startHangMan(this.message, this.participants);
        } else if (this.gameType === 'chessgame') {
            startChessGame(this.message, this.participants);
        }
    }

    async makeMove(message, from, to) {
        try {
            const gameKey = `${message.author.id}-${Array.from(this.participants.keys()).find(id => id !== message.author.id)}`;
            await chessGame.makeMove(message, `${from}-${to}`, gameKey);
        } catch (error) {
            console.error(error);
            message.channel.send('Error making move: ' + error.message);
        }
    }
    endGame() {
        if (this.gameType === 'quiz') {
            quizGame.endQuiz();
        } else if (this.gameType === 'wordgame') {
            wordGame.endWordGame();
        } else if (this.gameType === 'mathgame') {
            mathGame.endMathGame();
        } else if (this.gameType === 'hangman') {
            hangMan.endHangMan();
        } else if (this.gameType === 'chessgame') {
            chessGame.endChessGame();
        }
    }
}

async function startJoinPhase(message) {
    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('React to Participate')
        .setDescription('React with ✅ to participate in the game! You have 5 seconds.');

    const gameMessage = await message.channel.send({ embeds: [embed] });
    await gameMessage.react('✅');

    const participants = new Map();

    const filter = (reaction, user) => {
        return reaction.emoji.name === '✅' && !user.bot;
    };

    const collector = gameMessage.createReactionCollector({ filter, time: 5000 });

    collector.on('collect', (reaction, user) => {
        if (!participants.has(user.id)) {
            participants.set(user.id, user.username);
            sendTemporaryEmbed(message.channel, `${user.username} has joined the game!`, user);
        }
    });

    return new Promise(resolve => {
        collector.on('end', collected => {
            resolve(participants);
        });
    });
}

async function sendTemporaryEmbed(channel, description, user) {
    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(description);

    const joinMessage = await channel.send({ embeds: [embed], content: `<@${user.id}> has joined the game!` });
    setTimeout(() => {
        joinMessage.delete().catch(console.error);
    }, 5000); // Delete after 5 seconds
}

async function startQuizGame(message, participants) {
    message.channel.send(`Starting quiz game with: ${Array.from(participants.values()).join(', ')}`);
    await quizGame.startQuiz(message, participants);
    currentGame = null; // Game ended, reset currentGame
}

async function startWordGame(message, participants) {
    message.channel.send(`Starting word game with: ${Array.from(participants.values()).join(', ')}`);
    await wordGame.startWordGame(message, participants);
    currentGame = null; // Game ended, reset currentGame
}

async function startMathGame(message, participants) {
    message.channel.send(`Starting math game with: ${Array.from(participants.values()).join(', ')}`);
    await mathGame.startMathGame(message, participants);
    currentGame = null; // Game ended, reset currentGame
}

async function startHangMan(message, participants) {
    message.channel.send(`Starting hangman game with: ${Array.from(participants.values()).join(', ')}`);
    await hangMan.startHangMan(message, participants);
    currentGame = null; // Game ended, reset currentGame
}

async function startChessGame(message, participants) {
    message.channel.send(`Starting chess game between ${message.author.username} and ${participants.get(participants.keys().next().value)}`);
    await chessGame.startChessGame(message, participants);
}

client.login(process.env.DISCORD_TOKEN);
