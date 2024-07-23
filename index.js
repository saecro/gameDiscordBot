const schedule = require('node-schedule');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { MongoClient } = require('mongodb');
const MongoStore = require('connect-mongo');
const { exec } = require('child_process')
const readline = require('readline');
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
const saecro = '805009105855971329';
const angie = '721260969849913385'
const c = '989718366317056062';
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

function sendReminderMessage() {
    const channelId = '1261996162597257308'; // Replace with your specific channel ID
    const reminderMessage = "If there is anything you want added to the discord bot, please use the command as such: `!note add checkers game`. anyone that abuses this will receive a blacklist from the bot until otherwise.";

    const channel = client.channels.cache.get(channelId);
    if (channel && channel.isTextBased()) {
        channel.send(reminderMessage).catch(console.error);
    } else {
        console.error('Failed to send reminder message. Channel not found or is not a text channel.');
    }
}

async function getAura(userId) {
    console.log(`Fetching aura for userId: ${userId}`);
    const user = await auraCollection.findOne({ discordID: userId });
    console.log(`User aura: ${user ? user.aura : 0}`);
    return user ? user.aura : 0;
}
const notesFilePath = path.join(__dirname, 'notes.json');

// Initialize Discord Client
const database = mongoClient.db('discordGameBot');
const blockedCommandsCollection = database.collection('blockedCommands');
const toggledCommandsCollection = database.collection('toggledCommands');
const validGptRoleIds = database.collection('validGptRoleIds');
const timezoneCollection = database.collection('timezones');
const currencyCollection = database.collection('currency');
const logChannels = database.collection('LogChannels');
const roleCollection = database.collection('RoleIDs');
const aiMessages = database.collection('AIMessages');
const gamesCollection = database.collection('Games');
const timeoutLogs = database.collection('Timeouts');
const logChannel = database.collection('AIChannels');
const botServers = database.collection('botGuilds');
const auraCollection = database.collection('aura');
const blacklistCollection = database.collection('blacklist');
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
    let userId = message.author.id;
    let name = message.author.username;
    let mentionedUser = message.mentions.users.first();

    if (mentionedUser) {
        userId = mentionedUser.id;
        name = mentionedUser.username;
    }

    const balance = await getOrCreateUserCurrency(userId);
    const formattedBalance = formatBalance(balance.money);

    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`${name}'s Balance`)
        .setDescription(`${name} has ${formattedBalance} coins.`)
        .setTimestamp();

    console.log(`User balance: ${balance.money}`);
    return embed;
}

async function leaderboard(message) {
    const currencyCollection = database.collection('currency');

    // Fetch the top 10 users with the highest balance
    const topUsers = await currencyCollection.find().sort({ money: -1 }).limit(10).toArray();

    // Create the leaderboard embed
    const embed = new Discord.EmbedBuilder()
        .setColor('#ffd700')
        .setTitle('Leaderboard - Top 10 Richest Users')
        .setTimestamp();

    // Fetch user details from Discord
    for (let i = 0; i < topUsers.length; i++) {
        const user = await message.client.users.fetch(topUsers[i].discordID);
        const username = user ? user.username : 'Unknown User';
        embed.addFields({
            name: `${i + 1}. ${username}`,
            value: `${formatBalance(topUsers[i].money)} coins`,
        });
    }

    return message.channel.send({ embeds: [embed] });
}

async function sendMessageInParts(channel, message) {
    const messages = splitMessageByParagraphs(message);
    for (const msg of messages) {
        await channel.send(msg);
    }
}

function splitMessageByParagraphs(text) {
    const paragraphs = text.split('\n\n');
    const messages = [];
    let currentMessage = '';

    paragraphs.forEach(paragraph => {
        if ((currentMessage + paragraph).length > 2000) {
            messages.push(currentMessage);
            currentMessage = '';
        }
        currentMessage += paragraph + '\n\n';
    });

    if (currentMessage.trim().length > 0) {
        messages.push(currentMessage.trim());
    }

    return messages;
}

async function isCommandToggledOff(command, guildId) {
    console.log(`Checking if command is toggled off: ${command}, guildId: ${guildId}`);
    const toggledCommand = await toggledCommandsCollection.findOne({ command, guildId });
    console.log(`Command toggled off: ${!!toggledCommand}`);
    return !!toggledCommand;
}

function formatBalance(balance) {
    if (balance >= 1.0e+24) {
        return (balance / 1.0e+24).toFixed(1) + "Sp";
    } else if (balance >= 1.0e+21) {
        return (balance / 1.0e+21).toFixed(1) + "Sx";
    } else if (balance >= 1.0e+18) {
        return (balance / 1.0e+18).toFixed(1) + "Qn";
    } else if (balance >= 1.0e+15) {
        return (balance / 1.0e+15).toFixed(1) + "Qd";
    } else if (balance >= 1.0e+12) {
        return (balance / 1.0e+12).toFixed(1) + "T";
    } else if (balance >= 1.0e+9) {
        return (balance / 1.0e+9).toFixed(1) + "B";
    } else if (balance >= 1.0e+6) {
        return (balance / 1.0e+6).toFixed(1) + "M";
    } else if (balance >= 1.0e+3) {
        return (balance / 1.0e+3).toFixed(1) + "K";
    } else {
        return balance.toString();
    }
}

function getRandomGif() {
    const gifFolder = path.join(__dirname, 'gifs');
    const gifs = fs.readdirSync(gifFolder);
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
    console.log(`Selected random gif: ${randomGif}`);
    return path.join('gifs', randomGif);
}

async function isValidGptRoleId(userId) {
    console.log(`Checking if user has valid GPT role ID: ${userId}`);
    const validId = await validGptRoleIds.findOne({ userId });
    console.log(`User valid GPT role ID: ${validId !== null}`);
    return validId !== null;
}

async function addGptRoleId(userId) {
    console.log(`Adding GPT role ID for user: ${userId}`);
    await validGptRoleIds.updateOne(
        { userId },
        { $set: { userId } },
        { upsert: true }
    );
}

async function removeGptRoleId(userId) {
    console.log(`Removing GPT role ID for user: ${userId}`);
    await validGptRoleIds.deleteOne({ userId });
}

async function fetchRoleIDs() {
    console.log('Fetching role IDs');
    const documents = await roleCollection.find({}).toArray();
    roleIDs = documents.map(doc => doc.roleId);
    console.log(`Fetched role IDs: ${roleIDs}`);
}

function getAllFiles(dir, fileExtensionList, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory() && file !== 'node_modules') {
            getAllFiles(filePath, fileExtensionList, fileList);
        } else if (fileExtensionList.includes(path.extname(file))) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

// Function to count lines in a file
function countLines(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return fileContent.split('\n').length;
}

// Function to handle sending messages in chunks
async function sendInChunks(channel, message) {
    const maxLength = 2000;
    let currentMessage = '';

    for (const line of message.split('\n')) {
        if ((currentMessage + line + '\n').length > maxLength) {
            await channel.send('```' + currentMessage + '```');
            currentMessage = '';
        }
        currentMessage += line + '\n';
    }

    if (currentMessage.length > 0) {
        await channel.send('```' + currentMessage + '```');
    }
}

function isAdmin(member) {
    const isAdmin = member.id === saecro || member.permissions.has(Discord.PermissionsBitField.Flags.Administrator);
    console.log(`Checking if member is admin: ${member.id}, isAdmin: ${isAdmin}`);
    return isAdmin;
}

async function addRoleID(roleId) {
    try {
        console.log(`Adding role ID: ${roleId}`);
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
    console.log(`Fetching or creating user currency for userId: ${userId}`);
    let user = await currencyCollection.findOne({ discordID: userId });
    if (!user) {
        user = {
            discordID: userId,
            money: 1000,
            lastDaily: 0,
            lastWeekly: 0
        };
        await currencyCollection.insertOne(user);
    }
    console.log(`User currency: ${user.money}`);
    return user;
}

async function isPlayerInGame(playerId) {
    console.log(`Checking if player is in game: ${playerId}`);
    const chessGame = await gamesCollection.findOne({ playerId });
    const connect4Game = await gamesCollection.findOne({ playerId });
    const inGame = !!chessGame || !!connect4Game;
    console.log(`Player in game: ${inGame}`);
    return inGame;
}

async function removeRoleID(roleId) {
    try {
        console.log(`Removing role ID: ${roleId}`);
        await roleCollection.deleteOne({ roleId });
        console.log(`Role ID ${roleId} removed from the database.`);
        roleIDs = roleIDs.filter(id => id !== roleId);
    } catch (error) {
        console.error(`Error removing role ID ${roleId}:`, error);
    }
}

async function chatWithAssistant(userId, userMessage) {
    console.log(`Chatting with assistant, userId: ${userId}, userMessage: ${userMessage}`);
    let conversation_history = await getChatHistory(userId);
    conversation_history.push({
        role: 'system',
        content: `Hello, I'm here to be your nice and supportive friend. I'm always ready to lend a helping hand whenever you need it. Whether you have questions, need advice, or just want someone to talk to, I'm here for you. You can count on me to be there and provide assistance with anything you need. Let's make this a great experience together!`,
    });
    conversation_history.push({ role: "user", content: userMessage });

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: conversation_history,
    });
    const assistantMessage = response.choices[0].message.content;

    await saveMessage(userId, 'user', userMessage);
    await saveMessage(userId, 'assistant', assistantMessage);

    console.log(`Assistant response: ${assistantMessage}`);
    return assistantMessage;
}

async function setTimezone(message, location, userId) {
    console.log(`Setting timezone for userId: ${userId}, location: ${location}`);

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

async function showTimezone(message, userId) {
    console.log(`Showing timezone for userId: ${userId}`);

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
        .addFields({ name: 'Current Time', value: currentTime, inline: true });

    await message.channel.send({ embeds: [embed] });
}

async function drawWithAssistant(userMessage) {
    try {
        const sendRequest = {
            method: "post",
            url: "https://api.imaginepro.ai/api/v1/midjourney/imagine",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.MIDJOURNEY_API_KEY}`,
            },
            data: {
                prompt: userMessage,
            },
        };

        // Make the initial request to start the image generation
        const response = await axios(sendRequest);
        console.log(response.data)
        const messageId = response.data.messageId; // Assuming the response contains a messageId
        const grabRequest = {
            method: "get",
            url: `https://api.imaginepro.ai/api/v1/midjourney/message/${messageId}`,
            headers: {
                Authorization: `Bearer ${process.env.MIDJOURNEY_API_KEY}`,
            },
        };

        // Polling function
        const pollRequest = (grabRequest, interval = 1000) => {
            return new Promise((resolve, reject) => {
                const poll = async () => {
                    try {
                        const newResponse = await axios(grabRequest);
                        console.log(newResponse.data);

                        if (newResponse.data.status === 'DONE') {
                            clearInterval(polling);
                            resolve(newResponse.data);
                        }
                    } catch (error) {
                        clearInterval(polling);
                        reject(error);
                    }
                };

                const polling = setInterval(poll, interval);
            });
        };

        // Start polling
        const finalResponse = await pollRequest(grabRequest);

        // Fetch the image data once the status is 'DONE'
        const imageResponse = await axios.get(finalResponse.uri, { responseType: 'arraybuffer' });
        const imageData = Buffer.from(imageResponse.data, 'binary').toString('base64');

        console.log('Image generated successfully');
        return {
            updatedDetail: userMessage,
            imageData
        };

    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

async function getChatHistory(userId) {
    console.log(`Fetching chat history for userId: ${userId}`);
    const chatHistory = await aiMessages.find({ userId })
        .sort({ createdAt: -1 })
        .limit(7)
        .toArray();

    chatHistory.reverse();
    console.log(`Chat history: ${chatHistory.map(message => message.content)}`);
    return chatHistory.map(message => ({ role: message.role, content: message.content }));
}

async function saveMessage(userId, role, content) {
    console.log(`Saving message, userId: ${userId}, role: ${role}, content: ${content}`);
    await aiMessages.insertOne({ userId, role, content, createdAt: new Date() });
}

async function fetchBotGuilds() {
    console.log('Fetching bot guilds');
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

    await botServers.insertMany(guildsData);
    console.log('Bot guilds saved to database:', guildsData);
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
        console.log(`Joined new guild: ${guild.name}`);

        await guild.members.fetch();
        console.log(`Cached all members in guild: ${guild.name}`);
    } catch (error) {
        console.error(`Something happened in guild: ${guild.name}`, error);
    }
    await fetchBotGuilds();
});

async function updateAura(userId, amount) {
    console.log(`Updating aura for userId: ${userId}, amount: ${amount}`);
    await auraCollection.updateOne(
        { discordID: userId },
        { $inc: { aura: amount } },
        { upsert: true }
    );
}

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    console.log(`Guild member update, oldMember: ${oldMember.id}, newMember: ${newMember.id}`);
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
});

let currentGame = null;

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const userId = message.author.id;
    const playerGames = await getPlayerGames();
    console.log(`Player games map before message handling: ${JSON.stringify([...playerGames])}`);
    const args = message.content.trim().split(/ +/g);
    const command = args[0].toLowerCase();
    const guildId = message.guild.id;
    if (command === '!gptdraw') {
        if (!isAdmin(message.member)) {
            return
        }
    }
    if (message.content.includes('coomer.su')) {
        message.delete()
    }
    for (const roleId of roleIDs) {
        if (message.member.roles.cache.has(roleId)) {
            try {
                await message.react('💀')
            } catch (e) {
                console.log('message missing')
            }
            break;
        }
    }


    const blacklistedUser = await blacklistCollection.findOne({ userId: userId });

    if (command.startsWith('!')) {
        if (await isCommandToggledOff(command, guildId)) {
            return message.channel.send(`The command \`${command}\` is currently disabled in this server.`);
        }
        const blockedChannelCommands = await blockedCommandsCollection.findOne({ channelId: message.channel.id });
        if (blockedChannelCommands && blockedChannelCommands.blockedCommands.includes(command)) {
            return false;
        }
        if (blacklistedUser) {
            return message.channel.send(`You are blacklisted from using commands.`);
        }

        await getOrCreateUserCurrency(message.author.id); // Ensure the user currency is initialized
        if (command === '!switch') {
            if (!isAdmin(message.member)) {
                return message.channel.send('You do not have permission to use this command.');
            }

            const commandsToToggle = args.slice(1);

            if (commandsToToggle.length === 0) {
                return message.channel.send('Please provide the commands to toggle.');
            }

            for (const cmd of commandsToToggle) {
                const toggledCommand = await toggledCommandsCollection.findOne({ command: cmd, guildId });

                if (toggledCommand) {
                    await toggledCommandsCollection.deleteOne({ command: cmd, guildId });
                    await message.channel.send(`The command \`${cmd}\` has been enabled in this server.`);
                } else {
                    await toggledCommandsCollection.insertOne({ command: cmd, guildId });
                    await message.channel.send(`The command \`${cmd}\` has been disabled in this server.`);
                }
            }
            return;
        } else if (command === '!blacklist') {
            if (!isAdmin(message.member)) {
                return message.channel.send('You do not have permission to use this command.');
            }

            const mentionedUser = message.mentions.users.first();
            if (!mentionedUser) {
                const blacklistedUsers = await blacklistCollection.find({}).toArray();
                console.log(blacklistedUsers)
                let Description = ''
                if (blacklistedUsers) {
                    blacklistedUsers.forEach((user, index) => {
                        Description += `${index}. <@${user.userId}>\n`;
                    });
                } else {
                    Description = 'No Blacklisted Users'
                }

                const embed = new Discord.EmbedBuilder()
                    .setTitle(`Blacklisted Users`)
                    .setDescription(Description)
                    .setColor('#ff0000');

                return await message.channel.send({ embeds: [embed] });

            }

            const blacklistedUser = await blacklistCollection.findOne({ userId: mentionedUser.id });

            if (blacklistedUser) {
                await blacklistCollection.deleteOne({ userId: mentionedUser.id });
                await message.channel.send(`Removed ${mentionedUser.tag} from the blacklist.`);
            } else {
                await blacklistCollection.insertOne({ userId: mentionedUser.id });
                await message.channel.send(`Added ${mentionedUser.tag} to the blacklist.`);
            }
            return;
        } else if (command === '!exitgame') {
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
            const bet = parseInt(args[1], 10);
            if (!isNaN(bet)) {
                await slotMachineGame.slotMachineGame(message, bet);
            } else {
                await message.channel.send('Please enter a valid bet amount. `!slots 100`');
            }
        } else if (command === '!balance' || command === '!bal') {
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
            const choice = args[1];
            if (!choice) {
                await message.channel.send('Please specify a piece for promotion (Q, R, B, N).');
                return;
            }
            await chessGame.promote(message, choice);
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

            if ((!gptChannelId || message.channel.id !== gptChannelId)) {
                if (userId !== saecro) {
                    const channelMention = gptChannelId ? `<#${gptChannelId}>` : 'the specified channel';
                    return await message.channel.send(`The \`!gpt\` command can only be used in ${channelMention}.`);
                }
            }

            // Check if user is in validGptRoleIds collection
            if (!await isValidGptRoleId(userId)) {
                return await message.channel.send('You do not have permission to use this command.');
            }

            const now = Date.now();
            const cooldownAmount = 60 * 1000;

            if (cooldowns.gpt.has(userId)) {
                const expirationTime = cooldowns.gpt.get(userId) + cooldownAmount;
                if (now < expirationTime && userId !== saecro) {
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
                await sendMessageInParts(message.channel, response);
            } else {
                await message.channel.send('Please provide a prompt after the command.');
            }
        } else if (command === '!gptdraw') {
            const valid = await isValidGptRoleId(userId);
            const gptChannelDoc = await logChannels.findOne({ guildId: message.guild.id });
            const gptDrawChannelId = gptChannelDoc ? gptChannelDoc.gptDrawChannelId : null;

            if (!gptDrawChannelId || message.channel.id !== gptDrawChannelId) {
                if (userId !== saecro) {
                    const channelMention = gptDrawChannelId ? `<#${gptDrawChannelId}>` : 'the specified channel';
                    return await message.channel.send(`The \`!gptdraw\` command can only be used in ${channelMention}.`);
                }
            }

            // Check if user is in validGptRoleIds collection
            if (!valid) {
                return await message.channel.send('You do not have permission to use this command. Ask Saecro for permission.');
            }

            const now = Date.now();
            const cooldownAmount = 5 * 60 * 1000;

            if (cooldowns.gptdraw.has(userId)) {
                const expirationTime = cooldowns.gptdraw.get(userId) + cooldownAmount;
                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return await message.channel.send(`Please wait ${timeLeft.toFixed(1)} more seconds before reusing the \`!gptdraw\` command.`);
                }
            }
            if (userId !== saecro) {
                cooldowns.gptdraw.set(userId, now);
                setTimeout(() => cooldowns.gptdraw.delete(userId), cooldownAmount);
            }
            const prompt = args.slice(1).join(' ');
            if (prompt) {
                try {
                    await message.channel.sendTyping();
                    // const data = await drawWithAssistant(prompt);
                    // if (data.error) {
                    //     throw new Error(data.error.message);
                    // }
                    // let base64Image = data.imageData;
                    // const newPrompt = data.updatedDetail;
                    // console.log(newPrompt)

                    const row1 = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId('U1')
                                .setLabel('U1')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId('U2')
                                .setLabel('U2')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId('U3')
                                .setLabel('U3')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId('U4')
                                .setLabel('U4')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId('↺')
                                .setLabel('↺')
                                .setStyle(Discord.ButtonStyle.Danger),
                        );

                    const row2 = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId('V1')
                                .setLabel('V1')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId('V2')
                                .setLabel('V2')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId('V3')
                                .setLabel('V3')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId('V4')
                                .setLabel('V4')
                                .setStyle(Discord.ButtonStyle.Primary),
                        );

                    let base64Image = `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`
                    if (base64Image) {
                        await message.channel.send('prompt:``' + 'newPrompt' + '``');
                        await message.channel.send({
                            files: [{
                                attachment: Buffer.from(base64Image, 'base64'),
                                name: 'drawn_image.png'
                            }], components: [row1, row2]
                        })
                    } else {
                        await message.channel.send('Failed to generate image.');
                        cooldowns.gptdraw.delete(userId);
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
        } else if (command === '!gptrole') {
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
            if (isAdmin(message.member) || userId === saecro) {
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
            if (isAdmin(message.member) || userId === saecro) {
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
            if (isAdmin(message.member) || userId === saecro) {
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
            if (isAdmin(message.member) || userId === saecro) {
                let roleId = args[1];
                let duration = args[2];

                if (roleId && duration) {
                    if (!await roleCollection.findOne({ roleId })) {

                        const roleMentionMatch = roleId.match(/^<@&(\d+)>$/);
                        if (roleMentionMatch) {
                            roleId = roleMentionMatch[1];
                        }

                        if (!/^\d+$/.test(roleId)) {
                            return await message.channel.send('Please provide a valid role ID.');
                        }

                        const durationMatch = duration.match(/^(\d+)([smhd])$/);
                        if (!durationMatch) {
                            return await message.channel.send('Please provide a valid duration (e.g., 10s, 5m, 1h, 1d).');
                        }

                        const [_, time, unit] = durationMatch;
                        const milliseconds = {
                            's': 1000,
                            'm': 60 * 1000,
                            'h': 60 * 60 * 1000,
                            'd': 24 * 60 * 60 * 1000
                        }[unit] * parseInt(time, 10);

                        await addRoleID(roleId);
                        await message.channel.send(`Role ID ${roleId} has been added to the skull list for ${duration}.`);

                        schedule.scheduleJob(Date.now() + milliseconds, async () => {
                            await removeRoleID(roleId);
                            await message.channel.send(`Role ID ${roleId} has been removed from the skull list after ${duration}.`);
                        });
                    } else {
                        return await message.channel.send('This role already has autoskull')
                    }
                } else {
                    const roleMentionMatch = roleId.match(/^<@&(\d+)>$/);
                    if (roleMentionMatch) {
                        roleId = roleMentionMatch[1];
                    }

                    if (!/^\d+$/.test(roleId)) {
                        return await message.channel.send('Please provide a valid role ID.');
                    }

                    if (!await roleCollection.findOne({ roleId })) {
                        await addRoleID(roleId);
                        await message.channel.send(`Role ID ${roleId} has been added to the skull list.`);
                    } else {
                        await removeRoleID(roleId)
                        await message.channel.send(`Role ID ${roleId} has been removed from the skull list.`);
                    }
                }
            } else {
                return await message.channel.send('You do not have permission to use this command.');
            }
        } else if (command === '!shop') {
            if (message.author.id === saecro) {
                await shop.listShopItems(message);
            }
        } else if (command === '!buy') {
            if (message.author.id === saecro) {
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
            if (message.author.id === saecro) {
                await shop.showInventory(message);
            }
        } else if (command === '!tz') {
            if (args[1] && args[1].toLowerCase() === 'set') {
                if (!args[2]) {
                    return await message.channel.send('Please provide a city in the format `!tz set [City, Country/State]`.');
                }
                const city = args.slice(2).join(' ');
                await setTimezone(message, city, userId);
            } else {
                await showTimezone(message, userId);
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
        } else if (command === '!rape') {
            let user = message.mentions.users.first();
            let member = message.guild.members.cache.get(message.author.id);
            const hasRequiredRole = member.roles.cache.some(role =>
                ['1210746667427561563', '1138038219775160441'].includes(role.id)
            );

            if (!hasRequiredRole) {
                message.channel.send("your greenie ass can't rape anyone");
                return;
            }
            if (user) {

                if (user.id === '1242601206627434708') {
                    return message.channel.send("you can't rape the bot nigga.")
                }
                console.log(user.id, userId)
                if (user.id !== userId) {
                    if ((user.id !== saecro || message.author.id === c) &&
                        user.id !== c) {
                        const randomGifPath = getRandomGif();
                        const embed = new Discord.EmbedBuilder()
                            .setDescription(`<@${user.id}> has been raped!`)
                            .setImage(`attachment://${path.basename(randomGifPath)}`)
                            .setColor('#FF0000');

                        return await message.channel.send({
                            embeds: [embed],
                            files: [{
                                attachment: randomGifPath,
                                name: path.basename(randomGifPath)
                            }]
                        });

                    } else {
                        return await message.channel.send(`${user.username} cannot be raped`);
                    }
                } else {
                    return await message.channel.send(`<@${userId}> you can't rape yourself 😭😭, go masturbate.`)
                }
            } else {
                return await message.channel.send('you need to rape someone.')
            }
        } else if (command === '!aura') {
            console.log('getting aura');
            const aura = await getAura(message.author.id);
            const embed = new Discord.EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`${message.author.username}'s Aura`)
                .setDescription(`You have ${aura} aura points.`)
                .setTimestamp();
            await message.channel.send({ embeds: [embed] });
        } else if (command === '!donate') {
            const mentionedUser = message.mentions.users.first();
            const amount = parseInt(args[2], 10);

            if (!mentionedUser || isNaN(amount) || amount <= 0) {
                return await message.channel.send('Please mention a valid user and enter a valid amount.');
            }

            const userCurrency = await currencyCollection.findOne({ discordID: message.author.id });

            if (!userCurrency || userCurrency.money < amount) {
                return await message.channel.send('You do not have enough money to donate that amount.');
            }

            await currencyCollection.updateOne(
                { discordID: message.author.id },
                { $inc: { money: -amount } }
            );

            await currencyCollection.updateOne(
                { discordID: mentionedUser.id },
                { $inc: { money: amount } }
            );

            await message.channel.send(`Successfully donated ${amount} coins to ${mentionedUser.username}.`);
        } else if (command === '!daily') {
            const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours

            const lastDaily = await currencyCollection.findOne({ discordID: userId });

            const now = Date.now();

            if (lastDaily && now - lastDaily.lastDaily < dailyCooldown) {
                const timeLeft = dailyCooldown - (now - lastDaily.lastDaily);
                const hours = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
                return await message.channel.send(`You can claim your next daily reward in ${hours} hours and ${minutes} minutes.`);
            }

            await currencyCollection.updateOne(
                { discordID: userId },
                { $inc: { money: 100 }, $set: { lastDaily: now } },
                { upsert: true }
            );

            await message.channel.send('You have claimed your daily reward of 100 coins.');
        } else if (command === '!weekly') {
            const weeklyCooldown = 7 * 24 * 60 * 60 * 1000; // 7 days

            const lastWeekly = await currencyCollection.findOne({ discordID: userId });

            const now = Date.now();

            if (lastWeekly && now - lastWeekly.lastWeekly < weeklyCooldown) {
                const timeLeft = weeklyCooldown - (now - lastWeekly.lastWeekly);
                const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
                const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                return await message.channel.send(`You can claim your next weekly reward in ${days} days and ${hours} hours.`);
            }

            await currencyCollection.updateOne(
                { discordID: userId },
                { $inc: { money: 1000 }, $set: { lastWeekly: now } },
                { upsert: true }
            );

            await message.channel.send('You have claimed your weekly reward of 1000 coins.');
        } else if (command === '!block') {
            if (!isAdmin(message.member)) {
                return await message.channel.send('You do not have permission to use this command.');
            }

            const channel = message.mentions.channels.first() || message.channel;
            const commandsToBlock = args.slice(1);

            if (commandsToBlock.length === 0) {
                return await message.channel.send('Please provide the commands to block.');
            }

            await blockedCommandsCollection.updateOne(
                { channelId: channel.id },
                { $addToSet: { blockedCommands: { $each: commandsToBlock } } },
                { upsert: true }
            );

            return await message.channel.send(`Blocked commands in ${channel}: ${commandsToBlock.join(', ')}`);
        } else if (command === '!note') {
            const note = args.slice(1).join(' ');
            if (!note) {
                return await message.channel.send('Please provide a note to save.');
            }
            let notesData = {};
            try {
                if (fs.existsSync(notesFilePath)) {
                    notesData = JSON.parse(fs.readFileSync(notesFilePath, 'utf-8'));
                }
            } catch (error) {
                console.error('Error reading notes file:', error);
                return await message.channel.send('Failed to read notes file.');
            }

            if (!notesData[userId]) {
                notesData[userId] = [];
            }
            notesData[userId].push(note);

            try {
                fs.writeFileSync(notesFilePath, JSON.stringify(notesData, null, 2));
                await message.channel.send('Your note has been saved.');
            } catch (error) {
                console.error('Error writing notes file:', error);
                await message.channel.send('Failed to save your note.');
            }
        } else if (command === '!resetmoney') {
            if (message.author.id === saecro) {
                currencyCollection.deleteMany({});
                return message.channel.send('deleted all records on Database.');
            }
        } else if (command === '!give') {
            if (userId === saecro) {
                const mentionedUser = message.mentions.users.first();
                const amount = parseInt(args[2], 10);

                if (!mentionedUser || isNaN(amount) || amount <= 0) {
                    return await message.channel.send('Please mention a valid user and enter a valid amount.');
                }
                await currencyCollection.updateOne(
                    { discordID: mentionedUser.id },
                    { $inc: { money: amount } }
                );

                await message.channel.send(`Successfully donated ${amount} coins to ${mentionedUser.username}.`);
            }
        } else if (command === '!leaderboard' || command === '!lb') {
            await leaderboard(message);
        } else if (command === '!startdebugchess') {
            if (userId === saecro) {
                const mentionedUser = message.mentions.users.first();
                if (!mentionedUser) {
                    return await message.channel.send('Please mention a user to start a chess game with.');
                }

                const participants = new Map();
                participants.set(message.author.id, message.author.username);
                participants.set(mentionedUser.id, mentionedUser.username);

                await startChessGame(message, participants, true); // Pass true for debug mode
            }
        } else if (command === '!exec') {
            if (userId === saecro) {
                const executeCommand = args.slice(1).join(' ');
                exec(executeCommand, (error, stdout, stderr) => {
                    if (error) {
                        message.channel.send(`\`\`\`Error: ${error.message}\`\`\``);
                        return;
                    }
                    if (stderr) {
                        message.channel.send(`\`\`\`Stderr: ${stderr}\`\`\``);
                        return;
                    }
                    message.channel.send(`\`\`\`${stdout}\`\`\``);
                });
            }
        } else if (command === '!notes') {
            if (isAdmin(message.member)) {
                await sendNotesEmbeds(message.channel);
            }
        } else if (command === '!forget') {
            await aiMessages.deleteMany({})
            await message.channel.send('history reset for AI')
        } else if (command === '!cleartimeout') {
            if (!isAdmin(message.member)) {
                return await message.channel.send('You do not have permission to use this command.');
            }

            const mentionedUser = message.mentions.users.first();
            if (!mentionedUser) {
                return await message.channel.send('Please mention a user to clear the timeout.');
            }

            // Clear both GPT and GPT Draw command cooldowns
            cooldowns.gpt.delete(mentionedUser.id);
            cooldowns.gptdraw.delete(mentionedUser.id);

            await message.channel.send(`Timeout for user ${mentionedUser.username} has been cleared for both GPT commands.`);
        } else if (command === '!lines') {
            const baseDir = path.join(__dirname);  // Parent directory of the current directory
            const extensionsToCount = ['.js', '.ejs', '.css'];
            const allFiles = getAllFiles(__dirname, extensionsToCount);

            let totalLines = 0;
            let output = '';
            let partMessages = [];

            for (const file of allFiles) {
                const lines = countLines(file);
                const relativeFilePath = path.relative(baseDir, file);
                const newLine = `lines in ${relativeFilePath}: ${lines}\n`;
                if ((output + newLine).length > 2000) {
                    partMessages.push(output);
                    output = '';
                }
                output += newLine;
                totalLines += lines;
            }

            partMessages.push(output);
            partMessages.push(`Total lines of code: ${totalLines}`);

            for (const part of partMessages) {
                await sendInChunks(message.channel, part);
            }
        } else if (command === '!nuke') {
            await message.channel.send('Nuking the server...')
        }
    }
});

class GameSession {
    constructor(gameType, message, participants = null) {
        this.gameType = gameType;
        this.message = message;
        this.participants = participants || new Map();
        console.log(`Created new GameSession, gameType: ${gameType}, participants: ${participants}`);
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
        console.log(`Started game of type: ${this.gameType}`);
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
        console.log(`Ended game of type: ${this.gameType}`);
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

    const collector = gameMessage.createReactionCollector({ filter, time: 15000 });

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

async function startChessGame(message, participants, debug = false) {
    await chessGame.startChessGame(message, participants, debug);
}

async function startBlackjackGame(message, participants) {
    await message.channel.send(`Starting blackjack game with: ${Array.from(participants.values()).join(', ')}`);
    await blackjackGame.startBlackjackGame(message, participants);
    currentGame = null;
}

client.login(process.env.DISCORD_TOKEN);
setInterval(sendReminderMessage, 20 * 60 * 1000); // 20 minutes in milliseconds

function loadNotes() {
    let notesData = {};
    try {
        if (fs.existsSync(notesFilePath)) {
            notesData = JSON.parse(fs.readFileSync(notesFilePath, 'utf-8'));
        }
    } catch (error) {
        console.error('Error reading notes file:', error);
    }
    return notesData;
}

async function sendNotesEmbeds(channel) {
    const notesData = loadNotes();
    const userIds = Object.keys(notesData);

    if (userIds.length === 0) {
        return;
    }

    let currentUserIndex = 0;

    const sendEmbed = async (userId) => {
        const userNotes = notesData[userId];
        const user = await client.users.fetch(userId);

        if (!user) {
            console.error(`Failed to fetch user with ID: ${userId}`);
            return;
        }

        const embed = new Discord.EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(`${user.username}'s Notes`)
            .setDescription(userNotes.map(note => `• ${note}`).join('\n'))
            .setFooter({ text: `Page ${currentUserIndex + 1} of ${userIds.length}` })
            .setTimestamp();

        const row = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId('prevUser')
                    .setLabel('←')
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(currentUserIndex === 0),
                new Discord.ButtonBuilder()
                    .setCustomId('nextUser')
                    .setLabel('→')
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(currentUserIndex === userIds.length - 1),
                new Discord.ButtonBuilder()
                    .setCustomId('blacklistUser')
                    .setLabel('Blacklist')
                    .setStyle(Discord.ButtonStyle.Danger)
            );

        const message = await channel.send({ embeds: [embed], components: [row] });

        const filter = i => i.user.id === saecro; // Ensure only the user with the ID stored in 'saecro' can click the buttons
        const collector = message.createMessageComponentCollector({ filter, idle: 60000 }); // Set to 60 seconds of inactivity

        collector.on('collect', async i => {
            if (i.customId === 'prevUser' && currentUserIndex > 0) {
                currentUserIndex--;
            } else if (i.customId === 'nextUser' && currentUserIndex < userIds.length - 1) {
                currentUserIndex++;
            } else if (i.customId === 'blacklistUser') {

                const targetUserId = userIds[currentUserIndex];
                console.log(targetUserId)
                const blacklistedUser = await blacklistCollection.findOne({ userId: targetUserId });

                if (blacklistedUser) {
                    await blacklistCollection.deleteOne({ userId: targetUserId });
                    await channel.send(`Removed ${client.users.cache.get(targetUserId).tag} from the blacklist.`);
                } else {
                    await blacklistCollection.insertOne({ userId: targetUserId });
                    await channel.send(`Added ${client.users.cache.get(targetUserId).tag} to the blacklist.`);
                }
                return;
            }

            await i.update({
                embeds: [new Discord.EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`${client.users.cache.get(userIds[currentUserIndex]).username}'s Notes`)
                    .setDescription(notesData[userIds[currentUserIndex]].map(note => `• ${note}`).join('\n'))
                    .setFooter({ text: `Page ${currentUserIndex + 1} of ${userIds.length}` })
                    .setTimestamp()
                ],
                components: [
                    new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId('prevUser')
                                .setLabel('←')
                                .setStyle(Discord.ButtonStyle.Primary)
                                .setDisabled(currentUserIndex === 0),
                            new Discord.ButtonBuilder()
                                .setCustomId('nextUser')
                                .setLabel('→')
                                .setStyle(Discord.ButtonStyle.Primary)
                                .setDisabled(currentUserIndex === userIds.length - 1),
                            new Discord.ButtonBuilder()
                                .setCustomId('blacklistUser')
                                .setLabel('Blacklist')
                                .setStyle(Discord.ButtonStyle.Danger)
                        )
                ]
            });
        });

        collector.on('end', collected => {
            message.edit({ components: [] });
        });
    };

    await sendEmbed(userIds[currentUserIndex]);
}

// Calculate the time until the next scheduled execution
function getNextScheduledTime(hours, minutes, seconds) {
    const now = new Date();
    const next = new Date();

    next.setHours(hours);
    next.setMinutes(minutes);
    next.setSeconds(seconds);
    next.setMilliseconds(0);

    if (next <= now) {
        next.setDate(next.getDate() + 1); // Schedule for the next day if the time has already passed today
    }

    return next - now; // Return the time difference in milliseconds
}

function scheduleDailyTask(hours, minutes, seconds, task) {
    const timeUntilNextExecution = getNextScheduledTime(hours, minutes, seconds);

    // Schedule the first execution
    setTimeout(() => {
        task();
        // Schedule subsequent executions every 24 hours
        setInterval(task, 24 * 60 * 60 * 1000);
    }, timeUntilNextExecution);
}
