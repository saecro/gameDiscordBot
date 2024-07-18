const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { MongoClient } = require('mongodb');
const MongoStore = require('connect-mongo');
const Discord = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');
const OpenAI = require('openai');
const moment = require('moment-timezone');
const helpgame = require('./helpgame.js');
const path = require('path');
const fs = require('fs');
const socketIo = require('socket.io');


const cooldowns = {
    gpt: new Map(),
    gptdraw: new Map()
};

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB Connection
const mongoClient = new MongoClient(process.env.MONGO_URI);
mongoClient.connect().then(client => {
    console.log('Connected to MongoDB');
});

// Session Management
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ client: mongoClient })
}));

// Passport Configuration
require('./passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
app.use(express.static('public')); // Ensure Express serves static files from the public directory

app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));

app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

// Start watching botGuilds collection for changes
const startWatching = require('./watchBotGuilds');
startWatching(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// Initialize Discord Client
const database = mongoClient.db('discordGameBot');
const validGptRoleIds = database.collection('validGptRoleIds');
const timezoneCollection = database.collection('timezones');
const currencyCollection = database.collection('currency');
const logChannels = database.collection('LogChannels');
const roleCollection = database.collection('RoleIDs');
const aiMessages = database.collection('AIMessages');
const gamesCollection = database.collection('Games');
const timeoutLogs = database.collection('Timeouts');
const logChannel = database.collection('AIChannels')
const botServers = database.collection('botGuilds');
app.locals.db = database;

const slotMachineGame = require('./games/slotMachineGame.js');
const blackjackGame = require('./games/blackjackGame.js');
const connect4Game = require('./games/connect4game.js');
const chessGame = require('./games/chessgame.js');
const mathGame = require('./games/mathGame.js');
const greenTea = require('./games/greentea.js');
const blackTea = require('./games/blacktea.js');
const hangMan = require('./games/hangMan.js');
const quizGame = require('./games/quiz.js');
const shop = require('./shop/shop.js');

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMessageReactions,
        Discord.GatewayIntentBits.GuildMembers
    ]
});

const apiKey = process.env.FORTNITE_API_KEY;
const stateTimezones = {
    'alabama': 'America/Chicago',
    'alaska': 'America/Anchorage',
    'arizona': 'America/Phoenix',
    'arkansas': 'America/Chicago',
    'california': 'America/Los_Angeles',
    'colorado': 'America/Denver',
    'connecticut': 'America/New_York',
    'delaware': 'America/New_York',
    'florida': 'America/New_York',
    'georgia': 'America/New_York',
    'hawaii': 'Pacific/Honolulu',
    'idaho': 'America/Boise',
    'illinois': 'America/Chicago',
    'indiana': 'America/Indiana/Indianapolis',
    'iowa': 'America/Chicago',
    'kansas': 'America/Chicago',
    'kentucky': 'America/New_York',
    'louisiana': 'America/Chicago',
    'maine': 'America/New_York',
    'maryland': 'America/New_York',
    'massachusetts': 'America/New_York',
    'michigan': 'America/Detroit',
    'minnesota': 'America/Chicago',
    'mississippi': 'America/Chicago',
    'missouri': 'America/Chicago',
    'montana': 'America/Denver',
    'nebraska': 'America/Chicago',
    'nevada': 'America/Los_Angeles',
    'new hampshire': 'America/New_York',
    'new jersey': 'America/New_York',
    'new mexico': 'America/Denver',
    'new york': 'America/New_York',
    'north carolina': 'America/New_York',
    'north dakota': 'America/Chicago',
    'ohio': 'America/New_York',
    'oklahoma': 'America/Chicago',
    'oregon': 'America/Los_Angeles',
    'pennsylvania': 'America/New_York',
    'rhode island': 'America/New_York',
    'south carolina': 'America/New_York',
    'south dakota': 'America/Chicago',
    'tennessee': 'America/Chicago',
    'texas': 'America/Chicago',
    'utah': 'America/Denver',
    'vermont': 'America/New_York',
    'virginia': 'America/New_York',
    'washington': 'America/Los_Angeles',
    'west virginia': 'America/New_York',
    'wisconsin': 'America/Chicago',
    'wyoming': 'America/Denver'
};

const promotionChoices = new Map();

let roleIDs = [];

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1); // Exit the process to trigger PM2 restart
});

async function getPlayerGames() {
    const chessGamesArray = await gamesCollection.find().toArray();
    const connect4GamesArray = await gamesCollection.find().toArray();
    const games = chessGamesArray.concat(connect4GamesArray);
    return games.reduce((map, game) => {
        map.set(game.playerId, game.gameKey);
        return map;
    }, new Map());
}

async function getBalance(message) {
    const userId = message.author.id;
    const balance = await getOrCreateUserCurrency(userId);

    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`${message.author.username}'s Balance`)
        .setDescription(`You have ${balance} coins.`)
        .setTimestamp();

    return embed;
}

async function isValidGptRoleId(userId) {
    const validId = await validGptRoleIds.findOne({ userId });
    return validId !== null;
}

async function addGptRoleId(userId) {
    await validGptRoleIds.updateOne(
        { userId },
        { $set: { userId } },
        { upsert: true }
    );
}

async function removeGptRoleId(userId) {
    await validGptRoleIds.deleteOne({ userId });
}

async function fetchRoleIDs() {
    const documents = await roleCollection.find({}).toArray();
    roleIDs = documents.map(doc => doc.roleId);
}

function isAdmin(member) {
    return member.permissions.has(Discord.PermissionsBitField.Flags.Administrator);
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
            roleIDs.push(roleId);
        }
    } catch (error) {
        console.error(`Error adding role ID ${roleId}:`, error);
    }
}

async function getOrCreateUserCurrency(userId) {
    let user = await currencyCollection.findOne({ discordID: userId });
    if (!user) {
        user = {
            discordID: userId,
            money: 100
        };
        await currencyCollection.insertOne(user);
    }
    return user.money;
}

async function isPlayerInGame(playerId) {
    const chessGame = await gamesCollection.findOne({ playerId });
    if (chessGame) {
        return true;
    }

    const connect4Game = await gamesCollection.findOne({ playerId });
    if (connect4Game) {
        return true;
    }

    return false;
}

async function removeRoleID(roleId) {
    try {
        await roleCollection.deleteOne({ roleId });
        console.log(`Role ID ${roleId} removed from the database.`);
        roleIDs = roleIDs.filter(id => id !== roleId);
    } catch (error) {
        console.error(`Error removing role ID ${roleId}:`, error);
    }
}

async function chatWithAssistant(userId, userMessage) {
    let conversation_history = await getChatHistory(userId);
    conversation_history.push({
        role: 'system',
        content: `Hello, I'm here to be your nice and supportive friend. I'm always ready to lend a helping hand whenever you need it. Whether you have questions, need advice, or just want someone to talk to, I'm here for you. You can count on me to be there and provide assistance with anything you need. Let's make this a great experience together!`,
    });
    conversation_history.push({ role: "user", content: userMessage });

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: conversation_history,
        max_tokens: 150
    });
    const assistantMessage = response.choices[0].message.content;

    await saveMessage(userId, 'user', userMessage);
    await saveMessage(userId, 'assistant', assistantMessage);

    return assistantMessage;
}
async function setTimezone(message, location) {
    const userId = message.author.id;

    if (!location) {
        return message.channel.send('Please provide a valid location in the format `!tz set [City, Country/State]`.');
    }

    const normalizedLocation = location.toLowerCase();
    let timezone = moment.tz.names().find(tz => tz.toLowerCase().includes(normalizedLocation));

    if (!timezone) {
        timezone = stateTimezones[normalizedLocation];
    }

    if (!timezone) {
        return message.channel.send('Invalid timezone or location name. Please provide a valid city, optionally with country or state.');
    }

    await timezoneCollection.updateOne(
        { discordID: userId },
        { $set: { timezone } },
        { upsert: true }
    );

    message.channel.send(`Timezone for ${message.author.username} has been set to ${timezone}.`);
}

async function showTimezone(message) {
    const userId = message.author.id;
    const userTimezone = await timezoneCollection.findOne({ discordID: userId });

    if (!userTimezone) {
        return message.channel.send('You have not set a timezone yet.');
    }

    const currentTime = moment().tz(userTimezone.timezone).format('HH:mm:ss');
    const city = userTimezone.timezone.split('/').pop().replace('_', ' ');

    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`${message.author.username}'s Timezone`)
        .addFields({ name: 'City', value: city, inline: true })
        .addFields({ name: 'Current Time', value: currentTime, inline: true })

    await message.channel.send({ embeds: [embed] });
}

async function drawWithAssistant(userMessage) {
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: userMessage,
            n: 1,
            size: "1024x1024",
        });
        const imageUrl = response.data[0].url;


        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageData = Buffer.from(imageResponse.data, 'binary').toString('base64');

        return imageData;
    } catch (error) {
        console.error('Error generating or fetching image:', error);
        return error;
    }
}

async function getChatHistory(userId) {
    const chatHistory = await aiMessages.find({ userId })
        .sort({ createdAt: -1 })
        .limit(7)
        .toArray();

    chatHistory.reverse();
    return chatHistory.map(message => ({ role: message.role, content: message.content }));
}

async function saveMessage(userId, role, content) {
    await aiMessages.insertOne({ userId, role, content, createdAt: new Date() });
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    await fetchRoleIDs();
    client.user.setActivity('Managing roles', { type: 'PLAYING' });


    await gamesCollection.deleteMany({});

    console.log('Caching all users');
    const guildPromises = client.guilds.cache.map(async (guild) => {

        await guild.members.fetch();
    });
    await Promise.all(guildPromises);

    console.log('All users cached and processed');

});

client.on('guildCreate', async (guild) => {
    try {

        await guild.members.fetch();
        console.log(`Cached all members in guild: ${guild.name}`);

    } catch (error) {
        console.error(`Something happened in guild: ${guild.name}`, error);
    }
    await fetchBotGuilds();
});

async function fetchBotGuilds() {
    await botServers.deleteMany({});

    const guildsData = await Promise.all(client.guilds.cache.map(async (guild) => {
        // Fetch guild data including icon and banner
        const guildData = await client.guilds.fetch(guild.id, { withCounts: true });
        const iconURL = guildData.iconURL({ format: 'png', dynamic: true, size: 1024 });
        const bannerURL = guildData.bannerURL({ format: 'png', dynamic: true, size: 1024 });

        return {
            id: guild.id,
            name: guild.name,
            icon: iconURL,
            banner: bannerURL
        };
    }));

    await collection.insertMany(guildsData);
    console.log('Bot guilds saved to database:', guildsData);
}

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const roleIDs = ['list', 'of', 'role', 'IDs'];
    const gptRole = newMember.guild.roles.cache.find(role => role.name === 'gpt');

    for (const roleId of roleIDs) {
        const hadRole = oldMember.roles.cache.has(roleId);
        const hasRole = newMember.roles.cache.has(roleId);

        if (!hadRole && hasRole) {

            console.log(`User ${newMember.id} was granted role ${roleId}`);
        } else if (hadRole && !hasRole) {

            console.log(`User ${newMember.id} was removed from role ${roleId}`);
        }
    }

    if (gptRole) {
        if (!oldMember.roles.cache.has(gptRole.id) && newMember.roles.cache.has(gptRole.id)) {

            const auditLogs = await newMember.guild.fetchAuditLogs({
                limit: 1,
                type: Discord.AuditLogEvent.MemberRoleUpdate,
            });
            const logEntry = auditLogs.entries.first();

            if (logEntry && logEntry.target.id === newMember.id && logEntry.changes.some(change => change.key === '$add' && change.new.find(role => role.id === gptRole.id))) {
                const executor = logEntry.executor;
                if (executor.id !== '1242601206627434708') {
                    await newMember.roles.remove(gptRole);
                }
            }
        }
    }

    console.log('working');
    if (!oldMember.isCommunicationDisabled() && newMember.isCommunicationDisabled()) {
        if (newMember.communicationDisabledUntil) {
            try {

                const auditLogs = await newMember.guild.fetchAuditLogs({
                    limit: 5,
                    type: Discord.AuditLogEvent.MemberUpdate,
                });


                const auditEntry = auditLogs.entries
                    .filter(entry => entry.target.id === newMember.id)
                    .find(entry => entry.changes.some(change => change.key === 'communication_disabled_until'));

                const timeoutReason = auditEntry ? auditEntry.reason || "No reason provided." : "No reason provided.";

                const embed = new Discord.EmbedBuilder()
                    .setTitle('Member Timed Out')
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Member', value: newMember.user.tag, inline: true },
                        { name: 'Reason', value: timeoutReason, inline: true },
                        { name: 'Until', value: newMember.communicationDisabledUntil.toISOString(), inline: true }
                    )
                    .setTimestamp();


                await timeoutLogs.insertOne({
                    guildId: newMember.guild.id,
                    userId: newMember.id,
                    userName: newMember.user.tag,
                    reason: timeoutReason,
                    until: new Date(newMember.communicationDisabledUntil),
                    createdAt: new Date()
                });


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
    } else if (oldMember.isCommunicationDisabled() && !newMember.isCommunicationDisabled()) {

        try {
            await timeoutLogs.deleteOne({
                guildId: newMember.guild.id,
                userId: newMember.id
            });
            console.log(`Removed timeout log for user ${newMember.id} in guild ${newMember.guild.id}`);
        } catch (error) {
            console.error(`Error removing timeout log for guild ${newMember.guild.id}:`, error);
        }
    }
})

let currentGame = null;

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const playerGames = await getPlayerGames();
    console.log(`Player games map before message handling: ${JSON.stringify([...playerGames])}`);
    const args = message.content.trim().split(/ +/g);
    const command = args[0].toLowerCase();

    for (const roleId of roleIDs) {
        if (message.member.roles.cache.has(roleId)) {
            message.react('💀').catch(console.error);
            break;
        }
    }

    if (command.startsWith('!')) {
        await getOrCreateUserCurrency(message.author.id); // Ensure the user currency is initialized
        if (command === '!exitgame') {
            if (currentGame) {
                currentGame.endGame();
                currentGame = null;
            } else {
                await message.channel.send('No game is currently running.');
            }
            return;
        } else if (currentGame && command !== '!move' && command.startsWith('!start') && command !== '!startchessgame' && command !== '!startconnect4') {
            await message.channel.send('A game is already in progress. Please wait for it to finish before starting a new one.');
            return;
        } else if (command === '!help') {
            const commands = await helpgame.readCommandsFile();
            if (!commands) {
                return await message.channel.send('Failed to load commands.');
            }

            const helpCategory = args[1] ? args[1].toLowerCase() : null;
            if (helpCategory === 'admin') {
                await helpgame.handleHelpCommand(message, commands.adminCommands);
            } else if (helpCategory === 'games') {
                await helpgame.handleHelpCommand(message, commands.gameCommands);
            } else if (helpCategory === 'general') {
                await helpgame.handleHelpCommand(message, commands.generalCommands);
            } else {
                const sections = [
                    { name: 'Admin Commands', commands: commands.adminCommands },
                    { name: 'Game Commands', commands: commands.gameCommands },
                    { name: 'Normal Commands', commands: commands.generalCommands }
                ];

                function createSectionEmbed(section, index) {
                    return new Discord.EmbedBuilder()
                        .setTitle(`Help - ${section.name}`)
                        .setColor('#00ff00')
                        .setDescription('Here are the available commands:')
                        .addFields(section.commands.map(command => (
                            { name: command.title, value: `${command.description}` }
                        )))
                        .setTimestamp()
                        .setFooter({ text: `Section ${index + 1} of ${sections.length}` });
                }

                async function handleHelpSections(message) {
                    let currentSectionIndex = 0;

                    const helpEmbed = createSectionEmbed(sections[currentSectionIndex], currentSectionIndex);
                    const row = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId('prevSection')
                                .setLabel('←')
                                .setStyle(Discord.ButtonStyle.Primary)
                                .setDisabled(currentSectionIndex === 0),
                            new Discord.ButtonBuilder()
                                .setCustomId('nextSection')
                                .setLabel('→')
                                .setStyle(Discord.ButtonStyle.Primary)
                                .setDisabled(currentSectionIndex === sections.length - 1)
                        );

                    const helpMessage = await message.channel.send({ embeds: [helpEmbed], components: [row] });

                    const filter = i => i.user.id === message.author.id;
                    const collector = helpMessage.createMessageComponentCollector({ filter, time: 60000 });

                    collector.on('collect', async i => {
                        if (i.customId === 'prevSection' && currentSectionIndex > 0) {
                            currentSectionIndex--;
                        } else if (i.customId === 'nextSection' && currentSectionIndex < sections.length - 1) {
                            currentSectionIndex++;
                        }

                        await i.update({
                            embeds: [createSectionEmbed(sections[currentSectionIndex], currentSectionIndex)],
                            components: [
                                new Discord.ActionRowBuilder()
                                    .addComponents(
                                        new Discord.ButtonBuilder()
                                            .setCustomId('prevSection')
                                            .setLabel('←')
                                            .setStyle(Discord.ButtonStyle.Primary)
                                            .setDisabled(currentSectionIndex === 0),
                                        new Discord.ButtonBuilder()
                                            .setCustomId('nextSection')
                                            .setLabel('→')
                                            .setStyle(Discord.ButtonStyle.Primary)
                                            .setDisabled(currentSectionIndex === sections.length - 1)
                                    )
                            ]
                        });
                    });

                    collector.on('end', collected => {
                        helpMessage.edit({ components: [] });
                    });
                }

                await handleHelpSections(message);
            }
        } else if (command === '!startquiz') {
            currentGame = new GameSession('quiz', message);
            await currentGame.start();
        } else if (command === '!startmathgame') {
            currentGame = new GameSession('mathgame', message);
            await currentGame.start();
        } else if (command === '!startgreentea') {
            currentGame = new GameSession('greentea', message);
            await currentGame.start();
        } else if (command === '!startblacktea') {
            currentGame = new GameSession('blacktea', message);
            await currentGame.start();
        } else if (command === '!starthangman') {
            currentGame = new GameSession('hangman', message);
            await currentGame.start();
        } else if (command === '!startchessgame') {
            const mentionedUser = message.mentions.users.first();
            if (!mentionedUser) {
                return await message.channel.send('Please mention a user to start a chess game with.');
            }

            if (mentionedUser.bot) {
                return await message.channel.send('You cannot play chess with a bot.');
            }

            if (mentionedUser.id === message.author.id) {
                return await message.channel.send('You cannot play chess with yourself.');
            }

            const authorInGame = await isPlayerInGame(message.author.id);
            const mentionedUserInGame = await isPlayerInGame(mentionedUser.id);

            if (authorInGame || mentionedUserInGame) {
                return await message.channel.send('One or both players are already in a game.');
            }

            const participants = new Map();
            participants.set(message.author.id, message.author.username);
            participants.set(mentionedUser.id, mentionedUser.username);

            await chessGame.startChessGame(message, participants);
        } else if (command === '!startconnect4') {
            const mentionedUser = message.mentions.users.first();
            if (!mentionedUser) {
                return await message.channel.send('Please mention a user to start a Connect 4 game with.');
            }

            if (mentionedUser.bot) {
                return await message.channel.send('You cannot play Connect 4 with a bot.');
            }

            if (mentionedUser.id === message.author.id) {
                return await message.channel.send('You cannot play Connect 4 with yourself.');
            }

            const authorInGame = await isPlayerInGame(message.author.id);
            const mentionedUserInGame = await isPlayerInGame(mentionedUser.id);

            if (authorInGame || mentionedUserInGame) {
                return await message.channel.send('One or both players are already in a game.');
            }

            const participants = new Map();
            participants.set(message.author.id, message.author.username);
            participants.set(mentionedUser.id, mentionedUser.username);

            await connect4Game.startConnect4Game(client, message, participants);
        } else if (command === '!startblackjack') {
            currentGame = new GameSession('blackjack', message);
            await currentGame.start();
        } else if (command === '!slots') {
            const bet = args[1]
            if (!isNaN(bet)) {
                await slotMachineGame.slotMachineGame(message, bet);
            } else {
                await message.channel.send('Please enter a valid bet amount. `!slots 100`');
            }
        } else if (command === '!balance') {
            const embed = await getBalance(message);
            await message.channel.send({ embeds: [embed] });
        } else if (command === '!move') {
            const gameKey = playerGames.get(message.author.id);
            const from = args[1];
            const to = args[2];
            if (!from || !to) {
                return await message.channel.send('Please provide a move in the format: !move <from> <to>. Example: !move e2 e4');
            }
            if (!(from.length !== 2 || to.length !== 2)) {

                const playerGames = await getPlayerGames();

                console.log(`!move command with gameKey: ${gameKey}`);
                console.log(`Player games map: ${JSON.stringify([...playerGames])}`);

            } else {
                return await message.channel.send('Invalid Choices, Please provide a move in the format: !move <from> <to>. Example: !move e2 e4');
            }
            if (gameKey) {
                await chessGame.makeMove(message, `${from}-${to}`, gameKey);
            } else {
                await message.channel.send('No chess game in progress.');
            }
        } else if (command === '!resign') {
            await chessGame.resignGame(message);
        } else if (command === '!draw') {
            await chessGame.proposeDraw(message);
        } else if (command === '!promote') {
            const playerGames = await getPlayerGames();
            const gameKey = playerGames.get(message.author.id);

            console.log(`!promote command with gameKey: ${gameKey}`);

            if (gameKey && promotionChoices.has(gameKey)) {
                const choice = args[1].toLowerCase();
                if (!['q', 'r', 'b', 'n'].includes(choice)) {
                    await message.channel.send('Invalid choice! Please choose: Q (Queen), R (Rook), B (Bishop), N (Knight)');
                } else {
                    promotionChoices.set(gameKey, { ...promotionChoices.get(gameKey), choice });
                    await chessGame.makeMove(message, `${promotionChoices.get(gameKey).from}-${promotionChoices.get(gameKey).to}`, gameKey, choice);
                }
            } else {
                await message.channel.send('No pawn to promote or invalid game.');
            }
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
                const embed = new Discord.EmbedBuilder()
                    .setTitle(`Fortnite Stats for ${username}`)
                    .setThumbnail(stats.image)
                    .addFields(
                        { name: 'Wins', value: `${stats.stats.all.overall.wins}`, inline: true },
                        { name: 'Kills', value: `${stats.stats.all.overall.kills}`, inline: true },
                        { name: 'Matches Played', value: `${stats.stats.all.overall.matches}`, inline: true },
                        { name: 'Peak Rank', value: `${stats.battlePass.level}`, inline: true },
                        { name: 'Current Rank', value: `${stats.battlePass.progress}`, inline: true }
                    )
                    .setImage('https://example.com/rank-image.png')
                    .setColor('#00ff00');

                await message.channel.send({ embeds: [embed] });
            } catch (error) {
                console.log(error);
                await message.channel.send('Error fetching stats. Make sure the username is correct.');
            }
        } else if (command === '!gpt') {
            const gptChannelDoc = await logChannels.findOne({ guildId: message.guild.id });
            const gptChannelId = gptChannelDoc ? gptChannelDoc.gptChannelId : null;

            if (!gptChannelId || message.channel.id !== gptChannelId) {
                const channelMention = gptChannelId ? `<#${gptChannelId}>` : 'the specified channel';
                return await message.channel.send(`The \`!gpt\` command can only be used in ${channelMention}.`);
            }

            const userId = message.author.id;

            // Check if user is in validGptRoleIds collection
            if (!await isValidGptRoleId(userId)) {
                return await message.channel.send('You do not have permission to use this command.');
            }

            const now = Date.now();
            const cooldownAmount = 60 * 1000;

            if (cooldowns.gpt.has(userId)) {
                const expirationTime = cooldowns.gpt.get(userId) + cooldownAmount;
                if (now < expirationTime && userId !== '805009105855971329') {
                    const timeLeft = (expirationTime - now) / 1000;
                    return await message.channel.send(`Please wait ${timeLeft.toFixed(1)} more seconds before reusing the \`!gpt\` command.`);
                }
            }

            cooldowns.gpt.set(userId, now);
            setTimeout(() => cooldowns.gpt.delete(userId), cooldownAmount);

            const prompt = args.slice(1).join(' ');
            if (prompt) {
                await message.channel.sendTyping();
                const response = await chatWithAssistant(userId, prompt);
                await message.channel.send(response);
            } else {
                await message.channel.send('Please provide a prompt after the command.');
            }
        } else if (command === '!gptdraw') {
            const userId = message.author.id;
            const valid = isValidGptRoleId(userId)
            const gptChannelDoc = await logChannels.findOne({ guildId: message.guild.id });
            const gptDrawChannelId = gptChannelDoc ? gptChannelDoc.gptDrawChannelId : null;

            if (!gptDrawChannelId || message.channel.id !== gptDrawChannelId) {
                const channelMention = gptDrawChannelId ? `<#${gptDrawChannelId}>` : 'the specified channel';
                return await message.channel.send(`The \`!gptdraw\` command can only be used in ${channelMention}.`);
            }

            // Check if user is in validGptRoleIds collection
            if (!await isValidGptRoleId(userId)) {
                return await message.channel.send('You do not have permission to use this command. Ask Saecro for permission.');
            }

            const now = Date.now();
            const cooldownAmount = 10 * 60 * 1000;

            if (cooldowns.gptdraw.has(userId)) {
                const expirationTime = cooldowns.gptdraw.get(userId) + cooldownAmount;
                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return await message.channel.send(`Please wait ${timeLeft.toFixed(1)} more seconds before reusing the \`!gptdraw\` command.`);
                }
            }
            if (userId !== '805009105855971329') {
                cooldowns.gptdraw.set(userId, now);
                setTimeout(() => cooldowns.gptdraw.delete(userId), cooldownAmount);
            }
            const prompt = args.slice(1).join(' ');
            if (prompt) {
                try {
                    await message.channel.sendTyping();
                    const base64Image = await drawWithAssistant(prompt);
                    if (!base64Image.error) {
                        if (base64Image) {
                            await message.channel.send({
                                files: [{
                                    attachment: Buffer.from(base64Image, 'base64'),
                                    name: 'drawn_image.png'
                                }]
                            });
                        } else {
                            await message.channel.send('Failed to generate image.');
                            cooldowns.gptdraw.delete(userId);
                        }
                    }
                    else {
                        await message.channel.send(base64Image.error.message);
                    }
                } catch (error) {
                    console.error('Error handling !gptdraw command:', error);
                    if (error.message === 'This request has been blocked by our content filters.') {
                        await message.channel.send(error.message);
                    } else {
                        await message.channel.send('Failed to process your request.');
                    }
                    cooldowns.gptdraw.delete(userId);
                }
            } else {
                await message.channel.send('Please provide a prompt after the command.');
            }
        } else if (message.content.startsWith('!gptrole')) {
            const mentionedUser = message.mentions.users.first();
            if (!mentionedUser) {
                return await message.channel.send('Please mention a user to assign the GPT role.');
            }

            const isValidUser = await validGptRoleIds.findOne({ userId: mentionedUser.id });

            if (isValidUser) {
                await removeGptRoleId(mentionedUser.id);
                await message.channel.send(`Removed ${mentionedUser.tag} from the list of valid GPT role users.`);
            } else {
                await addGptRoleId(mentionedUser.id);
                await message.channel.send(`Added ${mentionedUser.tag} to the list of valid GPT role users.`);
            }
            return;
        } else if (command === '!gptchannel') {
            const userId = message.author.id;

            if (isAdmin(message.member) || userId === '805009105855971329') {
                const mentionedChannel = message.mentions.channels.first();
                const channelId = mentionedChannel ? mentionedChannel.id : args[1];

                if (!channelId) {
                    return await message.channel.send('Please mention a valid channel or provide a valid channel ID.');
                }

                const channel = message.guild.channels.cache.get(channelId);
                if (!channel || !channel.isTextBased()) {
                    return await message.channel.send('Invalid channel ID. Please provide a valid text channel ID.');
                }

                await logChannels.updateOne(
                    { guildId: message.guild.id },
                    { $set: { gptChannelId: channel.id, guildId: message.guild.id } },
                    { upsert: true }
                );
                return await message.channel.send(`GPT commands are now restricted to the channel: ${channel}`);
            } else {
                return await message.channel.send('You do not have permission to use this command.');
            }
        } else if (command === '!gptdrawchannel') {
            const userId = message.author.id;

            if (isAdmin(message.member) || userId === '805009105855971329') {
                const mentionedChannel = message.mentions.channels.first();
                const channelId = mentionedChannel ? mentionedChannel.id : args[1];

                if (!channelId) {
                    return await message.channel.send('Please mention a valid channel or provide a valid channel ID.');
                }

                const channel = message.guild.channels.cache.get(channelId);
                if (!channel || !channel.isTextBased()) {
                    return await message.channel.send('Invalid channel ID. Please provide a valid text channel ID.');
                }

                await logChannels.updateOne(
                    { guildId: message.guild.id },
                    { $set: { gptDrawChannelId: channel.id, guildId: message.guild.id } },
                    { upsert: true }
                );
                return await message.channel.send(`GPT Draw commands are now restricted to the channel: ${channel}`);
            } else {
                return await message.channel.send('You do not have permission to use this command.');
            }
        } else if (command === '!timelog') {
            if (isAdmin(message.member)) {

                const channel = message.mentions.channels.first();
                if (channel) {
                    await logChannels.updateOne(
                        { guildId: message.guild.id },
                        { $set: { channelId: channel.id } },
                        { upsert: true }
                    );
                    return await message.channel.send(`Log channel set to ${channel}`);
                } else {
                    return await message.channel.send('Please mention a valid channel.');
                }
            } else {
                return await message.channel.send('You do not have permission to use this command.');
            }

        } else if (command === '!skull') {
            let userId = message.author.id;
            if (isAdmin(message.member) || userId === '805009105855971329') {

                let roleId = args[1];
                if (roleId) {

                    const roleMentionMatch = roleId.match(/^<@&(\d+)>$/);
                    if (roleMentionMatch) {
                        roleId = roleMentionMatch[1];
                    }


                    if (!/^\d+$/.test(roleId)) {
                        return await message.channel.send('Please provide a valid role ID.');
                    }


                    if (roleIDs.includes(roleId)) {

                        await removeRoleID(roleId);
                        return await message.channel.send(`Removed role ID ${roleId} from the list.`);
                    } else {

                        await addRoleID(roleId);
                        return await message.channel.send(`Added role ID ${roleId} to the list.`);
                    }
                } else {
                    return await message.channel.send('You need to mention a role.');
                }
            } else {
                return await message.channel.send('You do not have permission to use this command.');
            }
        } else if (command === '!shop') {
            if (message.author.id === '805009105855971329') {
                await shop.listShopItems(message);
            }
        } else if (command === '!buy') {
            if (message.author.id === '805009105855971329') {
                const itemName = args.slice(1, -1).join(' ');
                const quantityArg = args.slice(-1)[0];
                const quantity = isNaN(quantityArg) ? 1 : parseInt(quantityArg, 10);

                if (itemName || quantityArg) {
                    await shop.buyItem(message, itemName || quantityArg, quantity);
                } else {
                    await message.channel.send('Please use the correct format: !buy <item_name> <quantity>.');
                }
            }
        } else if (command === '!inventory') {
            if (message.author.id === '805009105855971329') {
                await shop.showInventory(message);
            }
        } else if (command === '!tz') {
            if (args[1] && args[1].toLowerCase() === 'set') {
                if (!args[2]) {
                    return await message.channel.send('Please provide a city in the format `!tz set [City, Country/State]`.');
                }
                const city = args.slice(2).join(' ');
                await setTimezone(message, city);
            } else {
                await showTimezone(message);
            }
        } else if (message.content.toLowerCase() === '!frimpong ping pong king kong') {
            const imagePath = path.join(__dirname, 'teaserimage.jpg');

            // Check if the file exists
            if (fs.existsSync(imagePath)) {
                // Create an attachment
                const attachment = new Discord.AttachmentBuilder(imagePath);

                // Send the attachment in the message channel
                message.channel.send({ files: [attachment] });
            } else {
                // If the file does not exist, send an error message
                message.channel.send('The file `teaserimage.jpg` does not exist in the directory.');
            }
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
            await this.message.channel.send('No one joined the game.');
            currentGame = null;
        }
    }

    async startGame() {
        if (this.gameType === 'quiz') {
            await startQuizGame(this.message, this.participants);
        } else if (this.gameType === 'mathgame') {
            await startMathGame(this.message, this.participants);
        } else if (this.gameType === 'greentea') {
            await startGreenTea(this.message, this.participants);
        } else if (this.gameType === 'hangman') {
            await startHangMan(this.message, this.participants);
        } else if (this.gameType === 'chessgame') {
            await startChessGame(this.message, this.participants);
        } else if (this.gameType === 'blackjack') {
            await startBlackjackGame(this.message, this.participants);
        } else if (this.gameType === 'blacktea') {
            await startBlackTea(this.message, this.participants);
        }
    }

    async makeMove(message, from, to) {
        try {
            const gameKey = `${message.author.id}-${Array.from(this.participants.keys()).find(id => id !== message.author.id)}`;
            console.log(`GameSession makeMove with gameKey: ${gameKey}`);
            const result = await chessGame.makeMove(message, `${from}-${to}`, gameKey);
            if (!result) {
                await message.channel.send('Invalid move, try again.');
            }
        } catch (error) {
            console.error(error);
            await message.channel.send('Error making move: ' + error.message);
        }
    }

    endGame() {
        if (this.gameType === 'quiz') {
            quizGame.endQuiz(this.message);
        } else if (this.gameType === 'mathgame') {
            mathGame.endMathGame(this.message);
        } else if (this.gameType === 'hangman') {
            hangMan.endHangMan(this.message);
        } else if (this.gameType === 'chessgame') {
            chessGame.endChessGame(this.message, this.participants);
        } else if (this.gameType === 'blackjack') {
            blackjackGame.endBlackjackGame(this.message);
        } else if (this.gameType === 'greentea') {
            greenTea.endGreenTea(this.message);
        } else if (this.gameType === 'blacktea') {
            blackTea.endBlackTea(this.message);
        }
    }
}

async function startJoinPhase(message) {
    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('React to Participate')
        .setDescription('React with ✅ to participate in the game! You have 15 seconds.');

    const gameMessage = await message.channel.send({ embeds: [embed] });
    await gameMessage.react('✅');

    const participants = new Map();

    const filter = (reaction, user) => {
        return reaction.emoji.name === '✅' && !user.bot;
    };

    const collector = gameMessage.createReactionCollector({ filter, time: 3000 });

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

    const joinMessage = await channel.send({ embeds: [embed] });
    setTimeout(() => {
        joinMessage.delete().catch(console.error);
    }, 5000);
}

async function startQuizGame(message, participants) {
    await message.channel.send(`Starting quiz game with: ${Array.from(participants.values()).join(', ')}`);
    await quizGame.startQuiz(message, participants);
    currentGame = null;
}

async function startMathGame(message, participants) {
    await message.channel.send(`Starting math game with: ${Array.from(participants.values()).join(', ')}`);
    await mathGame.startMathGame(message, participants);
    currentGame = null;
}

async function startGreenTea(message, participants) {
    await message.channel.send(`Starting greentea with: ${Array.from(participants.values()).join(', ')}`);
    await greenTea.startGreenTea(message, participants);
    currentGame = null;
}

async function startBlackTea(message, participants) {
    await message.channel.send(`Starting blacktea with: ${Array.from(participants.values()).join(', ')}`);
    await blackTea.startBlackTea(message, participants);
    currentGame = null;
}

async function startHangMan(message, participants) {
    await message.channel.send(`Starting hangman game with: ${Array.from(participants.values()).join(', ')}`);
    await hangMan.startHangMan(message, participants);
    currentGame = null;
}

async function startChessGame(message, participants) {
    await chessGame.startChessGame(message, participants);
}

async function startBlackjackGame(message, participants) {
    await message.channel.send(`Starting blackjack game with: ${Array.from(participants.values()).join(', ')}`);
    await blackjackGame.startBlackjackGame(message, participants);
    currentGame = null;
}

client.login(process.env.DISCORD_TOKEN);