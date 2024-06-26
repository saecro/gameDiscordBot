
const { Client, PermissionsBitField, GatewayIntentBits, AuditLogEvent, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize MongoDB client
const mongo = new MongoClient(process.env.MONGO_URI);
const database = mongo.db('discordGameBot');
const roleCollection = database.collection('RoleIDs');
const aiMessages = database.collection('AIMessages');
const timeoutLogs = database.collection('Timeouts');
const logChannels = database.collection('LogChannels');
const chessGames = database.collection('chessGames');
const currencyCollection = database.collection('currency');
// Game modules
const quizGame = require('./games/quiz.js');
const mathGame = require('./games/mathGame.js');
const wordGame = require('./games/wordGame.js');
const hangMan = require('./games/hangMan.js');
const chessGame = require('./games/chessgame.js');
const blackjackGame = require('./games/blackjackGame.js');
const slotMachineGame = require('./games/slotMachine.js');

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

const apiKey = process.env.FORTNITE_API_KEY;

const promotionChoices = new Map();

let roleIDs = [];
async function getPlayerGames() {
    const games = await chessGames.find().toArray();
    return games.reduce((map, game) => {
        map.set(game.playerId, game.gameKey);
        return map;
    }, new Map());
}

async function fetchRoleIDs() {
    await mongo.connect();
    const documents = await roleCollection.find({}).toArray();
    roleIDs = documents.map(doc => doc.roleId);
}


async function addRoleID(roleId) {
    try {
        await roleCollection.updateOne(
            { roleId },
            { $set: { roleId } },
            { upsert: true }
        );
        console.log(`Role ID ${roleId} added to the database.`);
        if (!roleIDs.includes(roleId)) {
            roleIDs.push(roleId); // Add to the local cache
        }
    } catch (error) {
        console.error(`Error adding role ID ${roleId}:`, error);
    }
}

async function getOrCreateUserCurrency(userId) {
    let user = await currencyCollection.findOne({ discordID: userId });
    if (!user) {
        user = { discordID: userId, money: 100 };
        await currencyCollection.insertOne(user);
    }
    return user.money;
}

async function removeRoleID(roleId) {
    try {
        await roleCollection.deleteOne({ roleId });
        console.log(`Role ID ${roleId} removed from the database.`);
        roleIDs = roleIDs.filter(id => id !== roleId); // Remove from the local cache
    } catch (error) {
        console.error(`Error removing role ID ${roleId}:`, error);
    }
}

async function chatWithAssistant(userId, userMessage) {
    const conversation_history = await getChatHistory(userId);
    if (conversation_history.length === 0) {
        conversation_history.push({
            role: 'system',
            content: 'You are a loving and supportive girlfriend. Always be affectionate, considerate, and attentive to the user’s feelings and thoughts. You remember details about the user and always respond with warmth and positivity.',
        });
    }
    conversation_history.push({ role: "user", content: userMessage });

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: conversation_history,
    });
    const assistantMessage = response.choices[0].message.content;

    await saveMessage(userId, 'user', userMessage);
    await saveMessage(userId, 'assistant', assistantMessage);

    return assistantMessage;
}

async function drawWithAssistant(userMessage) {
    try {
        const response = await openai.images.generate({
            model: "dall-e-2",
            prompt: userMessage,
            n: 1,
            size: "1024x1024",
        });
        const imageUrl = response.data[0].url;

        // Fetch the image data
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageData = Buffer.from(imageResponse.data, 'binary').toString('base64');

        return  imageData
    } catch (error) {
        console.error('Error generating or fetching image:', error);
        return null;
    }
}

async function getChatHistory(userId) {
    const chatHistory = await aiMessages.find({ userId }).sort({ createdAt: 1 }).toArray();
    return chatHistory.map(message => ({ role: message.role, content: message.content }));
}

async function saveMessage(userId, role, content) {
    await aiMessages.insertOne({ userId, role, content, createdAt: new Date() });
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    await fetchRoleIDs();
    client.user.setActivity('Managing roles', { type: 'PLAYING' });

    // Clear all chess games
    await chessGames.deleteMany({});

    console.log('Caching all users');

    const guildPromises = client.guilds.cache.map(async (guild) => {
        try {
            // Fetch all members of the guild
            await guild.members.fetch();
            console.log(`Cached all members in guild: ${guild.name}`);

            // Loop through each member after fetching
            guild.members.cache.forEach((member) => {
                const userID = member.id;
                console.log(userID);
                getOrCreateUserCurrency(userID);
            });
        } catch (error) {
            console.error(`Something happened in guild: ${guild.name}`, error);
        }
    });

    // Await all guild processing promises
    await Promise.all(guildPromises);

    console.log('All users cached and processed');
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    for (const roleId of roleIDs) {
        const hadRole = oldMember.roles.cache.has(roleId);
        const hasRole = newMember.roles.cache.has(roleId);

        if (!hadRole && hasRole) {
            // Role was added
            console.log(`User ${newMember.id} was granted role ${roleId}`);
        } else if (hadRole && !hasRole) {
            // Role was removed
            console.log(`User ${newMember.id} was removed from role ${roleId}`);
        }
    }

    console.log('working');
    if (!oldMember.isCommunicationDisabled() && newMember.isCommunicationDisabled()) {
        if (newMember.communicationDisabledUntil) {
            try {
                // Fetch the relevant audit log entries
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    limit: 5,
                    type: AuditLogEvent.MemberUpdate, // Correct integer code for MEMBER_UPDATE
                });

                // Find the relevant audit log entry
                const auditEntry = auditLogs.entries
                    .filter(entry => entry.target.id === newMember.id)
                    .find(entry => entry.changes.some(change => change.key === 'communication_disabled_until'));

                const timeoutReason = auditEntry ? auditEntry.reason || "No reason provided." : "No reason provided.";

                const embed = new EmbedBuilder()
                    .setTitle('Member Timed Out')
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Member', value: newMember.user.tag, inline: true },
                        { name: 'Reason', value: timeoutReason, inline: true },
                        { name: 'Until', value: newMember.communicationDisabledUntil.toISOString(), inline: true }
                    )
                    .setTimestamp();

                // Save the log to the database
                await timeoutLogs.insertOne({
                    guildId: newMember.guild.id,
                    userId: newMember.id,
                    userName: newMember.user.tag,
                    reason: timeoutReason,
                    until: new Date(newMember.communicationDisabledUntil),
                    createdAt: new Date()
                });

                // Fetch the log channel ID from the database
                const logChannelDoc = await logChannels.findOne({ guildId: newMember.guild.id });
                const logChannelId = logChannelDoc ? logChannelDoc.channelId : null;

                if (logChannelId) {
                    const logChannel = newMember.guild.channels.cache.get(logChannelId);
                    if (logChannel && logChannel.isTextBased()) {
                        logChannel.send({ embeds: [embed] });
                    }
                }
            } catch (error) {
                console.error(`Error fetching audit logs for guild ${newMember.guild.id}:`, error);
            }
        }
    }
});

let currentGame = null;

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const playerGames = await getPlayerGames(); // Fetch player games from the database
    console.log(`Player games map before message handling: ${JSON.stringify([...playerGames])}`);
    const args = message.content.trim().split(/ +/g);
    const command = args[0].toLowerCase();


    if (command === '!timelog') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('You do not have permission to use this command.');
        }

        const channel = message.mentions.channels.first();
        if (channel) {
            await logChannels.updateOne(
                { guildId: message.guild.id },
                { $set: { channelId: channel.id } },
                { upsert: true }
            );
            return message.reply(`Log channel set to ${channel}`);
        } else {
            return message.reply('Please mention a valid channel.');
        }
    }

    // React with a skull emoji if the author has any of the saved role IDs
    for (const roleId of roleIDs) {
        if (message.member.roles.cache.has(roleId)) {
            message.react('💀').catch(console.error);
            break;
        }
    }

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

    if (command === '!help') {
        const embed = new EmbedBuilder()
            .setTitle('Help - List of Commands')
            .setColor('#00ff00')
            .setDescription('Here are the available commands, categorized by type:')

            .addFields(
                { name: 'Admin Commands', value: '\u200B' }, // \u200B adds an invisible space for better formatting
                { name: '!timelog #channel', value: 'Sets the log channel for timeout events.', inline: true },
                { name: '!skull <role_id>', value: 'Adds the specified role ID to the list for skull reactions.', inline: true },

                { name: '\u200B', value: '\u200B' }, // Empty field for spacing

                { name: 'Game Commands', value: '\u200B' },
                { name: '!startquiz', value: 'Starts a quiz game.', inline: true },
                { name: '!startwordgame', value: 'Starts a word game.', inline: true },
                { name: '!startmathgame', value: 'Starts a math game.', inline: true },
                { name: '!starthangman', value: 'Starts a hangman game.', inline: true },
                { name: '!startchessgame @user', value: 'Starts a chess game with the mentioned user.', inline: true },
                { name: '!startblackjack', value: 'Starts a blackjack game.', inline: true },
                { name: '!move <from> <to>', value: 'Makes a move in the current chess game.', inline: true },
                { name: '!resign', value: 'Resigns from the current chess game.', inline: true },
                { name: '!draw', value: 'Proposes a draw in the current chess game.', inline: true },
                { name: '!promote <choice>', value: 'Promotes a pawn in the current chess game. Choices: Q, R, B, N.', inline: true },
                { name: '!exitgame', value: 'Ends the current game.', inline: true },
                { name: '!endmathgame', value: 'Ends the current math game.', inline: true },

                { name: '\u200B', value: '\u200B' }, // Empty field for spacing

                { name: 'Normal Commands', value: '\u200B' },
                { name: '!help', value: 'Displays this help message.', inline: true },
                { name: '!stats <username>', value: 'Fetches Fortnite stats for the given username.', inline: true },
                { name: '!gpt <prompt>', value: 'Interacts with the chatbot using the provided prompt.', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Use these commands responsibly!' });

        message.channel.send({ embeds: [embed] });
    } else if (command === '!startquiz') {
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

        if (playerGames.has(message.author.id) || playerGames.has(mentionedUser.id)) {
            return message.channel.send('One or both players are already in a game.');
        }

        const participants = new Map();
        participants.set(message.author.id, message.author.username);
        participants.set(mentionedUser.id, mentionedUser.username);

        await chessGame.startChessGame(message, participants);
    } else if (command === '!startblackjack') {
        currentGame = new GameSession('blackjack', message);
        await currentGame.start();
    } else if (command === '!slots') {
        const bet = args[1]
        if (!isNaN(bet)) {
            await slotMachineGame.slotMachineGame(message, bet);
        } else {
            message.channel.send('Please enter a valid bet amount. `!slots 100`');
        }
    } else if (command === '!balance') {
        await getBalance(message);
    } else if (command === '!move') {
        const from = args[1];
        const to = args[2];
        if (!from || !to) {
            return message.channel.send('Please provide a move in the format: !move <from> <to>. Example: !move e2 e4');
        }

        const playerGames = await getPlayerGames(); // Fetch player games from the database
        const gameKey = playerGames.get(message.author.id);

        console.log(`!move command with gameKey: ${gameKey}`);
        console.log(`Player games map: ${JSON.stringify([...playerGames])}`);

        if (gameKey) {
            await chessGame.makeMove(message, `${from}-${to}`, gameKey);
        } else {
            message.channel.send('No chess game in progress.');
        }
    } else if (command === '!resign') {
        await chessGame.resignGame(message);
    } else if (command === '!draw') {
        await chessGame.proposeDraw(message);
    } else if (command === '!promote') {
        const playerGames = await getPlayerGames(); // Fetch player games from the database
        const gameKey = playerGames.get(message.author.id);

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
    } else if (command === '!endmathgame') {
        await mathGame.endMathGame(message);
    } else if (command === '!stats') {
        const username = message.content.split(' ')[1];
        try {
            const response = await axios.get(`https://fortnite-api.com/v2/stats/br/v2?name=${username}`, {
                headers: {
                    'Authorization': apiKey
                }
            });
            const stats = response.data.data;
            console.log(stats.stats.all);
            const embed = new EmbedBuilder()
                .setTitle(`Fortnite Stats for ${username}`)
                .setThumbnail(stats.image) // Add actual avatar URL from the API response if available
                .addFields(
                    { name: 'Wins', value: `${stats.stats.all.overall.wins}`, inline: true },
                    { name: 'Kills', value: `${stats.stats.all.overall.kills}`, inline: true },
                    { name: 'Matches Played', value: `${stats.stats.all.overall.matches}`, inline: true },
                    { name: 'Peak Rank', value: `${stats.battlePass.level}`, inline: true }, // Replace with actual peak rank if available
                    { name: 'Current Rank', value: `${stats.battlePass.progress}`, inline: true } // Replace with actual current rank if available
                )
                .setImage('https://example.com/rank-image.png') // Add actual rank image URL if available
                .setColor('#00ff00');

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.log(error);
            message.channel.send('Error fetching stats. Make sure the username is correct.');
        }
    } else if (command === '!skull') {
        // Check if the user has admin permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send('You do not have permission to use this command.');
        }

        let roleId = args[1];

        // Check if roleId is a mention and extract the ID
        const roleMentionMatch = roleId.match(/^<@&(\d+)>$/);
        if (roleMentionMatch) {
            roleId = roleMentionMatch[1];
        }

        // Validate roleId
        if (!/^\d+$/.test(roleId)) {
            return message.channel.send('Please provide a valid role ID.');
        }

        // Check if the role ID already exists in the list
        if (roleIDs.includes(roleId)) {
            // Remove the role ID if it exists
            await removeRoleID(roleId);
            return message.channel.send(`Removed role ID ${roleId} from the list.`);
        } else {
            // Add the role ID to the database if it doesn't exist
            await addRoleID(roleId);
            return message.channel.send(`Added role ID ${roleId} to the list.`);
        }
    } else if (command === '!gpt') {
        const prompt = args.slice(1).join(' ');

        if (prompt) {

            message.channel.sendTyping();

            const response = await chatWithAssistant(message.author.id, message.content);
            message.channel.send(response);
        } else {
            message.channel.send('Please provide a prompt after the command.');
        }
    } else if (command === '!gptdraw') {
        const prompt = args.slice(1).join(' ');

        if (prompt) {
            try {
                message.channel.sendTyping();

                const base64Image = await drawWithAssistant(prompt);

                // Send the image back to the user
                await message.channel.send({
                    files: [{
                        attachment: Buffer.from(base64Image, 'base64'),
                        name: 'drawn_image.png'
                    }]
                });
            } catch (error) {
                console.error('Error handling !gptdraw command:', error);
                message.reply('Failed to process your request.');
            }
        } else {
            message.reply('Please provide a prompt after the command.');
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