const fs = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize MongoDB client
const mongo = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const database = mongo.db('discordGameBot');
const autoSkull = database.collection('AutoSkullList');
const aiMessages = database.collection('AIMessages');

// Game modules
const quizGame = require('./games/quiz.js');
const mathGame = require('./games/mathGame.js');
const wordGame = require('./games/wordGame.js');
const hangMan = require('./games/hangMan.js');
const chessGame = require('./games/chessgame.js');
const blackjackGame = require('./games/blackjackGame.js');

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]
});

//const apiKey = process.env.FORTNITE_API_KEY;

const promotionChoices = new Map();
let personalChannel = null;

// Fetch initial list of Discord IDs from the database
let discordIDs = [];

async function fetchInitialDiscordIDs() {
    await mongo.connect();
    const documents = await autoSkull.find({}).toArray();
    discordIDs = documents.map(doc => doc.DiscordID);
}

async function addSkullUser(userId, username) {
    try {
        await autoSkull.updateOne(
            { DiscordID: userId },
            { $set: { DiscordID: userId, username: username } },
            { upsert: true }
        );
        console.log(`User ${username} (${userId}) added to AutoSkullList.`);
        discordIDs.push(userId); // Add to the local cache
    } catch (error) {
        console.error(`Error adding user ${userId} to AutoSkullList:`, error);
    }
}

async function removeSkullUser(userId) {
    try {
        await autoSkull.deleteOne({ DiscordID: userId });
        console.log(`User ${userId} removed from AutoSkullList.`);
        discordIDs = discordIDs.filter(id => id !== userId); // Remove from the local cache
    } catch (error) {
        console.error(`Error removing user ${userId} from AutoSkullList:`, error);
    }
}

async function getSkullUsers() {
    try {
        const documents = await autoSkull.find({}).toArray();
        return documents.map(doc => `<@${doc.DiscordID}>`).join('\n');
    } catch (error) {
        console.error('Error fetching skull users:', error);
    }
}

async function syncRolesWithDatabase(guild) {
    const roleId = '1250075018256453692'; // Replace with your specific role ID
    const members = await guild.members.fetch();

    for (const [memberId, member] of members) {
        const hasRole = member.roles.cache.has(roleId);
        if (hasRole && !discordIDs.includes(memberId)) {
            await addSkullUser(memberId, member.user.username);
        } else if (!hasRole && discordIDs.includes(memberId)) {
            await removeSkullUser(memberId);
        }
    }
}

async function saveMessage(userId, role, content) {
    await aiMessages.insertOne({
        userId,
        role,
        content,
        createdAt: new Date(),
    });
}

async function getChatHistory(userId) {
    const history = await aiMessages.find({ userId }).sort({ createdAt: 1 }).toArray();
    return history.map(message => ({ role: message.role, content: message.content }));
}



client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await fetchInitialDiscordIDs();
    client.user.setActivity('In Rape games', { type: 'COMPETING' });
    const guild = client.guilds.cache.get('1046895591076155502');
    if (guild) {
        await syncRolesWithDatabase(guild);
        const role = guild.roles.cache.get('1250075018256453692');
        if (role) {
            const members = await guild.members.fetch();
            const membersWithRole = members.filter(member => member.roles.cache.has(role.id));
            for (const member of membersWithRole.values()) {
                await addSkullUser(member.id, member.user.username);
            }
        }
    }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const roleId = '1250075018256453692';

    const hadRole = oldMember.roles.cache.has(roleId);
    const hasRole = newMember.roles.cache.has(roleId);

    if (!hadRole && hasRole) {
        // Role was added
        await addSkullUser(newMember.id, newMember.user.username);
    } else if (hadRole && !hasRole) {
        // Role was removed
        await removeSkullUser(newMember.id);
    }
});

let currentGame = null;

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // React with a skull emoji if the author is in the AutoSkullList
    if (discordIDs.includes(message.author.id)) {
        message.react('💀').catch(console.error);
    }

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

    if (currentGame && command !== '!move' && command.startsWith('!start') && command !== '!startchessgame') {
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

        if (chessGame.playerGames.has(message.author.id) || chessGame.playerGames.has(mentionedUser.id)) {
            return message.channel.send('One or both players are already in a game.');
        }

        const participants = new Map();
        participants.set(message.author.id, message.author.username);
        participants.set(mentionedUser.id, mentionedUser.username);

        await chessGame.startChessGame(message, participants);
    } else if (command === '!startblackjack') {
        currentGame = new GameSession('blackjack', message);
        await currentGame.start();
    } else if (command === '!move') {
        const from = args[1];
        const to = args[2];
        if (!from || !to) {
            return message.channel.send('Please provide a move in the format: !move <from> <to>. Example: !move e2 e4');
        }
        const gameKey = chessGame.playerGames.get(message.author.id);
        console.log(`!move command with gameKey: ${gameKey}`);
        console.log(`Player games map: ${JSON.stringify([...chessGame.playerGames])}`);
        if (gameKey) {
            await chessGame.makeMove(message, `${from}-${to}`, gameKey);
        } else {
            message.channel.send('No chess game in progress.');
        }
    } else if (command === '!resign') {
        await chessGame.resignGame(message);
    } else if (command === '!draw') {
        await chessGame.proposeDraw(message);
    } else if (command === '!endmathgame') {
        await mathGame.endMathGame(message);
    } else if (command === '!stats') {
        // const username = message.content.split(' ')[1];
        // try {
        //     const response = await axios.get(`https://fortnite-api.com/v2/stats/br/v2?name=${username}`, {
        //         headers: {
        //             'Authorization': apiKey
        //         }
        //     });
        //     const stats = response.data.data;
        //     console.log(stats.stats.all);
        //     const embed = new EmbedBuilder()
        //         .setTitle(`Fortnite Stats for ${username}`)
        //         .setThumbnail(stats.image) // Add actual avatar URL from the API response if available
        //         .addFields(
        //             { name: 'Wins', value: `${stats.stats.all.overall.wins}`, inline: true },
        //             { name: 'Kills', value: `${stats.stats.all.overall.kills}`, inline: true },
        //             { name: 'Matches Played', value: `${stats.stats.all.overall.matches}`, inline: true },
        //             { name: 'Peak Rank', value: `${stats.battlePass.level}`, inline: true }, // Replace with actual peak rank if available
        //             { name: 'Current Rank', value: `${stats.battlePass.progress}`, inline: true } // Replace with actual current rank if available
        //         )
        //         .setImage('https://example.com/rank-image.png') // Add actual rank image URL if available
        //         .setColor('#00ff00');

        //     message.channel.send({ embeds: [embed] });
        // } catch (error) {
        //     console.log(error);
        //     message.channel.send('Error fetching stats. Make sure the username is correct.');
        // }
    } else if (command === '!skull') {
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Current Skull Users')
                .setDescription(await getSkullUsers());

            return message.channel.send({ embeds: [embed] });
        }

        await addSkullUser(mentionedUser.id);
        return message.channel.send(`Added user ${mentionedUser.tag} to autoskull list.`);
    }

    // Chatbot functionality
    if (command === '!gpt') {
        const prompt = args.slice(1).join(' ');
        const userId = message.author.id;

        if (prompt) {
            await saveMessage(userId, 'user', prompt);

            let chatHistory = await getChatHistory(userId);

                chatHistory.push({
                    role: 'system',
                    content: `You are a loving and supportive girlfriend. Always be affectionate, considerate, and attentive to the user's feelings and thoughts. You remember details about the user and always respond with warmth and positivity.`,
                });

            chatHistory.push({ role: 'user', content: prompt });

            try {
                const chatCompletion = await openai.chat.completions.create({
                    model: 'gpt-3.5-turbo', // or 'gpt-4' if using GPT-4
                    messages: chatHistory,
                });

                const aiResponse = chatCompletion.choices[0].message.content;

                await saveMessage(userId, 'assistant', aiResponse);

                message.channel.send(aiResponse);
            } catch (error) {
                console.error('Error generating response:', error);
                message.channel.send('Sorry, I had trouble generating a response.');
            }
        } else {
            message.channel.send('Please provide a prompt after the command.');
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    console.log(`Player games map before message handling: ${JSON.stringify([...chessGame.playerGames])}`);
    const args = message.content.trim().split(/ +/g);
    const command = args[0].toLowerCase();

    if (command === '!promote') {
        const gameKey = chessGame.playerGames.get(message.author.id);
        console.log(`!promote command with gameKey: ${gameKey}`);
        if (gameKey && promotionChoices.has(gameKey)) {
            const choice = args[1].toLowerCase();
            if (!['q', 'r', 'b', 'n'].includes(choice)) {
                message.channel.send('Invalid choice! Please choose: Q (Queen), R (Rook), B (Bishop), N (Knight)');
            } else {
                promotionChoices.set(gameKey, { ...promotionChoices.get(gameKey), choice });
                await chessGame.makeMove(message, `${promotionChoices.get(gameKey).from}-${promotionChoices.get(gameKey).to}`, gameKey, choice);
            }
        } else {
            message.channel.send('No pawn to promote or invalid game.');
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
            await this.startGame();
        } else {
            this.message.channel.send('No one joined the game.');
            currentGame = null;
        }
    }

    async startGame() {
        if (this.gameType === 'quiz') {
            await startQuizGame(this.message, this.participants);
        } else if (this.gameType === 'wordgame') {
            await startWordGame(this.message, this.participants);
        } else if (this.gameType === 'mathgame') {
            await startMathGame(this.message, this.participants);
        } else if (this.gameType === 'hangman') {
            await startHangMan(this.message, this.participants);
        } else if (this.gameType === 'chessgame') {
            await startChessGame(this.message, this.participants);
        } else if (this.gameType === 'blackjack') {
            await startBlackjackGame(this.message, this.participants);
        }
    }

    async makeMove(message, from, to) {
        try {
            const gameKey = `${message.author.id}-${Array.from(this.participants.keys()).find(id => id !== message.author.id)}`;
            console.log(`GameSession makeMove with gameKey: ${gameKey}`);
            const result = await chessGame.makeMove(message, `${from}-${to}`, gameKey);
            if (!result) {
                message.channel.send('Invalid move, try again.');
            }
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
            mathGame.endMathGame(this.message);
        } else if (this.gameType === 'hangman') {
            hangMan.endHangMan();
        } else if (this.gameType === 'chessgame') {
            chessGame.endChessGame(this.message, this.participants);
        } else if (this.gameType === 'blackjack') {
            blackjackGame.endBlackjackGame();
        }
    }
}

async function startJoinPhase(message) {
    const embed = new EmbedBuilder()
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
    const embed = new EmbedBuilder()
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
    await chessGame.startChessGame(message, participants);
}

async function startBlackjackGame(message, participants) {
    message.channel.send(`Starting blackjack game with: ${Array.from(participants.values()).join(', ')}`);
    await blackjackGame.startBlackjackGame(message, participants);
    currentGame = null; // Game ended, reset currentGame
}

client.login(process.env.DISCORD_TOKEN);