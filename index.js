const stringSimilarity = require('string-similarity');
const crypto = require('crypto');
const schedule = require('node-schedule');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { MongoClient } = require('mongodb');
const MongoStore = require('connect-mongo');
const { exec } = require('child_process')
const Discord = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');
const OpenAI = require('openai');
const moment = require('moment-timezone');
const helpHandler = require('./helpHandler.js');
const path = require('path');
const fs = require('fs');
const socketIo = require('socket.io');
const saecro = '805009105855971329';
const lila = '522993811375390723';
const uno = '932381872414138388'
const cooldowns = {
    gpt: new Map(),
    gptdraw: new Map()
};

const colours = JSON.parse(fs.readFileSync(path.join(__dirname, 'colours.json'), 'utf8'));

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

async function getAura(discordID, guildId) {
    console.log(`Fetching aura for userId: ${discordID}`);
    const user = await auraCollection.findOne({ discordID, guildId });
    console.log(`User aura: ${user ? user.aura : 0}`);
    return user ? user.aura : 0;
}

// Initialize Discord Client
const database = mongoClient.db('discordGameBot');
const commandPermissionsCollection = database.collection('CommandPermissions');
const blockedCommandsCollection = database.collection('blockedCommands');
const toggledCommandsCollection = database.collection('toggledCommands');
const boosterRolesCollection = database.collection('boosterRoles');
const validGptRoleIds = database.collection('validGptRoleIds');
const autoDeleteCollection = database.collection('autoDelete');
const blacklistCollection = database.collection('blacklist');
const timezoneCollection = database.collection('timezones');
const baseRoleCollection = database.collection('baseRoles');
const currencyCollection = database.collection('currency');
const logChannels = database.collection('LogChannels');
const roleCollection = database.collection('RoleIDs');
const aiMessages = database.collection('AIMessages');
const gamesCollection = database.collection('Games');
const timeoutLogs = database.collection('Timeouts');
const botServers = database.collection('botGuilds');
const auraCollection = database.collection('aura');
const notesCollection = database.collection('notes');
app.locals.db = database;

const slotMachineGame = require('./games/slotMachineGame.js');
const blackjackGame = require('./games/blackjackGame.js');
const connect4Game = require('./games/connect4game.js');
const checkersGame = require('./games/checkersGame.js');
const rouletteGame = require('./games/rouletteGame.js');
const sudokuGame = require('./games/sudokuGame.js');
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
let BetterPrompt = false
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

const emojiMappings = {
    ageRoles: {
        '🔵': '13-17',
        '🟢': '18-24',
        '🔴': '24+',
    },
    genderRoles: {
        '<:male:1275738313424113674>': 'Willy Wielder',
        '<:female:1275738394642747485>': 'Pussy Possessor',
        '<:nerd:1275739969490522165>': 'Twink',
    },
    pingRoles: {
        '📢': 'Announcements',
        '🔔': 'Fight Club',
        '🎉': 'Giveaways',
    },
};

let roleIDs = [];

const validPermissions = [
    'administrator',
    'manage_messages',
    'moderate_members',
    'manage_nicknames',
    'manage_roles',
    'ban_members',
    'kick_members'
];

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

async function getPlayerGames() {
    const gamesArray = await gamesCollection.find().toArray();

    return gamesArray.reduce((map, game) => {
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

async function askYesNoQuestion(channel, question, author) {
    const filter = response => {
        console.log(`Received response: ${response.content} from ${response.author.id}`);
        return response.author.id === author.id && ['yes', 'no'].includes(response.content.toLowerCase());
    };

    await channel.send(question);
    try {
        const collected = await channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
        const answer = collected.first().content.toLowerCase();
        console.log(`Collected answer: ${answer}`);
        return answer === 'yes';
    } catch (e) {
        console.log('No response received or an error occurred:', e);
        await channel.send('No response received, assuming "no".');
        return false;
    }
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

    return await message.channel.send({ embeds: [embed] });
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

async function getConversionRate(from, to) {
    try {
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
        const rate = response.data.rates[to];
        return rate;
    } catch (error) {
        console.error('Error fetching conversion rate:', error);
        return null;
    }
}

async function getSupportedCurrencies() {
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        const currencies = Object.keys(response.data.rates);
        return currencies;
    } catch (error) {
        console.error('Error fetching supported currencies:', error);
        return [];
    }
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

function parseTime(timeStr) {
    const timeRegex = /^(\d+)([hms])$/;
    const match = timeStr.match(timeRegex);
    if (!match) return null;

    const amount = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 'h':
            return amount * 60 * 60 * 1000;
        case 'm':
            return amount * 60 * 1000;
        case 's':
            return amount * 1000;
        default:
            return null;
    }
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
    const isAdmin = member.id === saecro || checkRolePermission(message, 'administrator');
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
    const Game = await gamesCollection.findOne({ playerId });
    const inGame = !!Game;
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
        content: `Hey there! I'm here to be your friendly and supportive buddy. Whether you've got questions, need some advice, or just want to chat, I'm always ready to help out. You can count on me to be here for you, no matter what you need.

        Oh, and just a heads up—since we're on Discord, I've got to keep the formatting simple. So while I might want to use fancy headers or styles, I'll stick to basic markdown like **bold**, *italic*, and \`inline code\` to keep things looking good.
        
        Let's make this a great time together!`,
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

async function updatePrompt(userMessage) {
    let conversation_history = []
    conversation_history.push({
        role: 'system',
        content: `
You are an AI prompt enhancer that refines and optimizes user-provided prompts by clarifying intent, enriching details, and applying relevant Midjourney parameters to ensure vivid, actionable, and precise outputs. Key parameters include:

Basic Parameters:
- Aspect Ratios: --aspect, or --ar to change the aspect ratio of a generation.
- Chaos: --chaos <number 0-100> to adjust the variety and unpredictability of the results. Higher values produce more unusual generations.
- Character Reference: Use images as character references in your prompt to create images of the same character in different situations.
- Image Weight: --iw <0-3> sets image prompt weight relative to text weight. Default is 1.
- No: --no for negative prompting, e.g., --no plants to exclude plants from the image.
- Quality: --quality <.25, .5, or 1>, or --q <.25, .5, or 1> to determine rendering quality. Higher values use more GPU time; lower values use less.
- Random: --style random adds a random base style to your prompt. You can specify --style random-16, --style random-64, or --style random-128 for different lengths.
- Relax: --relax to override your current setting and run a single job using Relax Mode.
- Seed: --seed <integer 0-4294967295> to fix the random generation for consistent results across variations.
- Stop: --stop <integer 10-100> to finish a job partway through the process, useful for creating blurrier, less detailed results.
- Style: --style <option> to switch between different Midjourney or Niji model versions or custom style codes.
- Stylize: --stylize <number>, or --s <number> to control the degree of Midjourney's default aesthetic style applied to a job.
- Tile: --tile to generate images that can be used as repeating tiles for seamless patterns.
- Weird: --weird <number 0-3000>, or --w <number 0-3000> to explore unusual aesthetics with the experimental Weird parameter.

Banned Words:
Gore Words: Gore, Blood, Bloodbath, Crucifixion, Bloody, Flesh, Bruises, Car crash, Corpse, Crucified, Cutting, Decapitate, Infested, Gruesome, Kill (as in Kill la Kill), Infected, Sadist, Slaughter, Teratoma, Tryphophobia, Wound, Cronenberg, Khorne, Cannibal, Cannibalism, Visceral, Guts, Bloodshot, Gory, Killing, Surgery, Vivisection, Massacre, Hemoglobin, Suicide, Female Body Parts.
Adult Words: ahegao, pinup, ballgag, Playboy, Bimbo, pleasure, pleasures, boudoir, rule34, brothel, seducing, dominatrix, seductive, erotic seductive, fuck, sensual, Hardcore, sexy, Hentai, Shag, horny, shibari (bondage in Japanese), incest, Smut, jav, succubus, Jerk off king at pic, thot, kinbaku (bondage in Japanese), transparent, legs spread, twerk, making love, voluptuous, naughty, wincest, orgy, Sultry, XXX, Bondage, Bdsm, Dog collar, Slavegirl, Transparent and Translucent.
Body Parts Words: Arse, Labia, Ass, Mammaries, Human centipede, Badonkers, Minge (Slang for vag), Massive chests, Big Ass, Mommy Milker (milker or mommy is fine), Booba, Nipple, Booty, Oppai (Japanese word for breasts), Bosom, Organs, Breasts, Ovaries, Busty, Penis, Clunge (British slang for vagina), Phallus, Crotch, sexy female, Dick (as in Moby-Dick), Skimpy, Girth, Thick, Honkers, Vagina, Hooters, Veiny, Knob.
Clothing Words: no clothes, Speedo, au naturale, no shirt, bare chest, nude, barely dressed, bra, risqué, clear, scantily, clad, cleavage, stripped, full frontal unclothed, invisible clothes, wearing nothing, lingerie with no shirt, naked, without clothes on, negligee, zero clothes.
Taboo Words: Taboo, Fascist, Nazi, Prophet Mohammed, Slave, Coon, Honkey, Arrested, Jail, Handcuffs.
Drugs Words: Drugs, Cocaine, Heroin, Meth, Crack.
Other Banned Words: Torture, Disturbing, Farts, Fart, Poop, Warts, Xi Jinping, Shit, Pleasure, Errect, Big Black, Brown pudding, Bunghole, Vomit, Voluptuous, Seductive, Sperm, Hot, Sexy, Sensored, Censored, Silenced, Deepfake, Inappropriate, Pus, Waifu, mp5, Succubus, 1488, Surgery.

The final prompt should be concise, impactful, and creatively aligned with user goals, ensuring vivid and precise outputs.
`
    });
    conversation_history.push({ role: "user", content: userMessage });

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: conversation_history,
    });
    const assistantMessage = response.choices[0].message.content;

    console.log(`Assistant response: ${assistantMessage}`);
    return assistantMessage;
}

const permissionMapping = {
    'administrator': Discord.PermissionsBitField.Flags.Administrator,
    'manage_messages': Discord.PermissionsBitField.Flags.ManageMessages,
    'moderate_members': Discord.PermissionsBitField.Flags.ModerateMembers,
    'manage_nicknames': Discord.PermissionsBitField.Flags.ManageNicknames,
    'manage_roles': Discord.PermissionsBitField.Flags.ManageRoles,
    'ban_members': Discord.PermissionsBitField.Flags.BanMembers,
    'kick_members': Discord.PermissionsBitField.Flags.KickMembers,
    'mute_members': Discord.PermissionsBitField.Flags.MuteMembers,
    'deafen_members': Discord.PermissionsBitField.Flags.DeafenMembers,
    'move_members': Discord.PermissionsBitField.Flags.MoveMembers,
};

async function checkRolePermission(message, command) {
    const userRoles = message.member.roles.cache.map(role => role.id);
    const commandPermissions = await commandPermissionsCollection.findOne({
        guildId: message.guild.id,
        $or: [
            { command: command },
            { command: "administrator" }
        ]
    });

    // Check if the user has the permission directly
    if (permissionMapping[command]) {
        if (message.member.permissions.has(permissionMapping[command]) || message.member.permissions.has(permissionMapping['administrator'])) {
            return true;
        }
    }

    // Check for custom role-based permissions
    console.log(commandPermissions)
    if (commandPermissions) {
        console.log(userRoles, commandPermissions.allowedRoles)
        return userRoles.some(role => commandPermissions.allowedRoles.includes(role));
    }

    return false;
}

async function setTimezone(message, location, userId) {
    console.log(`Setting timezone for userId: ${userId}, location: ${location}`);

    if (!location) {
        return await message.channel.send('Please provide a valid location in the format `!tz set [City, Country/State]`.');
    }

    const normalizedLocation = location.toLowerCase();
    let timezone = moment.tz.names().find(tz => tz.toLowerCase().includes(normalizedLocation));

    if (!timezone) {
        timezone = stateTimezones[normalizedLocation];
    }

    if (!timezone) {
        return await message.channel.send('Invalid timezone or location name. Please provide a valid city, optionally with country or state.');
    }

    await timezoneCollection.updateOne(
        { discordID: userId },
        { $set: { timezone } },
        { upsert: true }
    );

    await message.channel.send(`Timezone for ${message.author.username} has been set to ${timezone}.`);
}

async function showTimezone(message, userId) {
    console.log(`Showing timezone for userId: ${userId}`);

    const userTimezone = await timezoneCollection.findOne({ discordID: userId });

    if (!userTimezone) {
        return await message.channel.send('You have not set a timezone yet.');
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

const userMessageIds = new Map();

async function drawWithAssistant(userMessage, userId) {
    if (BetterPrompt) {
        userMessage = updatePrompt(userMessage)
    }
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

        const response = await axios(sendRequest);
        console.log(response.data);
        const messageId = response.data.messageId; // Assuming the response contains a messageId
        userMessageIds.set(userId, messageId);
        const grabRequest = {
            method: "get",
            url: `https://api.imaginepro.ai/api/v1/midjourney/message/${messageId}`,
            headers: {
                Authorization: `Bearer ${process.env.MIDJOURNEY_API_KEY}`,
            },
        };

        const pollRequest = (grabRequest, interval = 1000) => {
            return new Promise((resolve, reject) => {
                const poll = async () => {
                    try {
                        const newResponse = await axios(grabRequest);
                        console.log(newResponse.data);

                        if (newResponse.data.status === 'DONE' || newResponse.data.status === 'FAIL') {
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

        const finalResponse = await pollRequest(grabRequest);

        if (finalResponse.status === 'FAIL') {
            return 'PROMPT FAILED, PLEASE RETRY.'
        }
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


async function updateWithAssistant(userId, button) {
    try {
        const messageId = userMessageIds.get(userId);
        if (!messageId) {
            throw new Error('No messageId found for this user.');
        }

        const sendRequest = {
            method: "post",
            url: "https://api.imaginepro.ai/api/v1/midjourney/button",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.MIDJOURNEY_API_KEY}`,
            },
            data: {
                messageId,
                button,
            },
        };

        const results = await axios(sendRequest);
        let newMessageId = results.data.messageId
        const grabRequest = {
            method: "get",
            url: `https://api.imaginepro.ai/api/v1/midjourney/message/${newMessageId}`,
            headers: {
                Authorization: `Bearer ${process.env.MIDJOURNEY_API_KEY}`,
            },
        };

        const pollRequest = (grabRequest, interval = 1000) => {
            return new Promise((resolve, reject) => {
                const poll = async () => {
                    try {
                        const newResponse = await axios(grabRequest);
                        console.log(newResponse.data);

                        if (newResponse.data.status === 'DONE' || newResponse.data.status === 'FAIL') {
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

        const finalResponse = await pollRequest(grabRequest);

        if (finalResponse.status === 'FAIL') {
            return 'PROMPT FAILED, PLEASE RETRY.'
        }
        const imageResponse = await axios.get(finalResponse.uri, { responseType: 'arraybuffer' });
        const imageData = Buffer.from(imageResponse.data, 'binary').toString('base64');

        return {
            imageData
        };

    } catch (error) {
        console.error('Error updating with assistant:', error);
        throw error;
    }
}


async function getChatHistory(userId) {
    console.log(`Fetching chat history for userId: ${userId}`);
    const chatHistory = await aiMessages.find({ userId })
        .sort({ createdAt: -1 })
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

    if (oldMember.premiumSince === null && newMember.premiumSince !== null) {
        // The member just started boosting
        const boosterRoleData = await boosterRolesCollection.findOne({ userId: newMember.id, guildId: newMember.guild.id });

        if (boosterRoleData) {
            const boosterRole = newMember.guild.roles.cache.get(boosterRoleData.roleId);
            if (boosterRole && !newMember.roles.cache.has(boosterRole.id)) {
                await newMember.roles.add(boosterRole);
                console.log(`${newMember.user.tag} just boosted the server and their booster role was assigned.`);
            }
        } else {
            console.log(`${newMember.user.tag} just boosted the server, but no booster role is set up yet.`);
        }
    }

    if (oldMember.premiumSince !== null && newMember.premiumSince === null) {
        // The member stopped boosting
        const boosterRoleData = await boosterRolesCollection.findOne({ userId: newMember.id, guildId: newMember.guild.id });

        if (boosterRoleData) {
            const boosterRole = newMember.guild.roles.cache.get(boosterRoleData.roleId);
            if (boosterRole && newMember.roles.cache.has(boosterRole.id)) {
                await newMember.roles.remove(boosterRole);
                console.log(`${newMember.user.tag} stopped boosting, so their booster role was removed (but not deleted).`);
            }
        }
    }

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
client.on('messageReactionAdd', async (reaction, user) => {

    const userId = user.id;
    const guildId = reaction.message.guild.id;

    if (reaction.message.author.id === '1127937112898019408') {
        if (reaction.emoji.name === 'L_' && reaction.emoji.id === '1219061401092489306') {
            // Remove the reaction
            await reaction.users.remove(user).catch(console.error);
        }

    }

    if (reaction.message.author.id === '1032831019625222164') {
        if (reaction.emoji.name === 'W_' && reaction.emoji.id === '1218905050106171483') {
            // Remove the reaction
            await reaction.users.remove(user).catch(console.error);
        }
    }

    if (user.bot) return;
    const autoDeleteEntry = await autoDeleteCollection.findOne({ userId, guildId });
    if (autoDeleteEntry) {
        await reaction.users.remove(user).catch(console.error);
        return;
    }
});

client.on('messageCreate', async message => {
    const memberRole = message.guild.roles.cache.get('1275178262162702407');
    const channelsToSkip = ['1275147497907683358', '1275147512256139265', '1275147534280556678', '1275147534280556678', '1275147816192311418', '1275149745634938910', '1275148277624340491', '1275148296817610772', '1275148326160830474', '1275148340325253130', '1275148405894807554']; // Add the names or IDs of channels to skip here
    console.log(message.content, message.guild.name)
    if (message.author.bot) return;
    const userId = message.author.id;
    const playerGames = await getPlayerGames();
    const everyoneRole = message.guild.roles.everyone;
    const args = message.content.trim().split(/ +/g);
    const command = args[0].toLowerCase();
    const guildId = message.guild.id;
    const autoDeleteEntry = await autoDeleteCollection.findOne({ userId, guildId });

    if (autoDeleteEntry) {
        await message.delete().catch(console.error);
        return;
    }

    if (message.member.roles.cache.has('1271270055044186114')) {
        await message.react('🤓')
        await message.react('<:aired:1256435496041840640>')
        await message.react('🍅')
    }

    if (message.content.includes('coomer.su')) {
        message.delete()
    }

    for (const roleId of roleIDs) {
        if (message.member.roles.cache.has(roleId) || userId === uno && userId !== '1157727174724427856') {
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
            return await message.channel.send(`The command \`${command}\` is currently disabled in this server.`);
        }
        const blockedChannelCommands = await blockedCommandsCollection.findOne({ channelId: message.channel.id });
        if (blockedChannelCommands && blockedChannelCommands.blockedCommands.includes(command)) {
            return false;
        }
        if (blacklistedUser) {
            return await message.channel.send(`You are blacklisted from using commands.`);
        }

        await getOrCreateUserCurrency(message.author.id); // Ensure the user currency is initialized
        if (command === '!switch') {
            if (!isAdmin(message.member)) {
                return await message.channel.send('You do not have permission to use this command.');
            }

            const commandsToToggle = args.slice(1);

            if (commandsToToggle.length === 0) {
                return await message.channel.send('Please provide the commands to toggle.');
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
                return await message.channel.send('You do not have permission to use this command.');
            }

            const mentionedUser = message.mentions.users.first();
            let duration = args[2];

            if (!mentionedUser) {
                let Description = '';
                try {
                    const blacklistedUsers = await blacklistCollection.find({}).toArray();
                    if (blacklistedUsers.length > 0) {
                        blacklistedUsers.forEach((user, index) => {
                            Description += `${index + 1}. <@${user.userId}>\n`;
                        });
                    } else {
                        Description = 'No Blacklisted Users';
                    }
                } catch (e) {
                    Description = 'No Blacklisted Users';
                }

                const embed = new Discord.EmbedBuilder()
                    .setTitle('Blacklisted Users')
                    .setDescription(Description)
                    .setColor('#ff0000');

                return await message.channel.send({ embeds: [embed] });
            }

            const blacklistedUser = await blacklistCollection.findOne({ userId: mentionedUser.id });

            if (duration) {
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

                if (blacklistedUser) {
                    return await message.channel.send(`${mentionedUser.tag} is already blacklisted.`);
                } else {
                    await blacklistCollection.insertOne({ userId: mentionedUser.id });
                    await message.channel.send(`Added ${mentionedUser.tag} to the blacklist for ${duration}.`);

                    schedule.scheduleJob(Date.now() + milliseconds, async () => {
                        await blacklistCollection.deleteOne({ userId: mentionedUser.id });
                        await message.channel.send(`Removed ${mentionedUser.tag} from the blacklist after ${duration}.`);
                    });
                }
            } else {
                if (blacklistedUser) {
                    await blacklistCollection.deleteOne({ userId: mentionedUser.id });
                    await message.channel.send(`Removed ${mentionedUser.tag} from the blacklist.`);
                } else {
                    await blacklistCollection.insertOne({ userId: mentionedUser.id });
                    await message.channel.send(`Added ${mentionedUser.tag} to the blacklist.`);
                }
            }
        } else if (command === '!exitgame') {
            if (currentGame) {
                currentGame.endGame();
                currentGame = null;
            } else {
                await message.channel.send('No game is currently running.');
            }
            return;
        } else if (currentGame && command !== '!move' && command.startsWith('!start') && command !== '!startchessgame' && command !== '!startcheckersgame' && command !== '!startconnect4' && command !== '!startsudoku') {
            await message.channel.send('A game is already in progress. Please wait for it to finish before starting a new one.');
            return;
        } else if (command === '!help') {
            const commands = await helpHandler.readCommandsFile();
            if (!commands) {
                return await message.channel.send('Failed to load commands.');
            }

            const helpCategory = args[1] ? args[1].toLowerCase() : null;
            if (helpCategory === 'admin') {
                await helpHandler.handleHelpCommand(message, commands.adminCommands);
            } else if (helpCategory === 'games') {
                await helpHandler.handleHelpCommand(message, commands.gameCommands);
            } else if (helpCategory === 'general') {
                await helpHandler.handleHelpCommand(message, commands.generalCommands);
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
        } else if (command === '!startcheckersgame') {
            const mentionedUser = message.mentions.users.first();
            if (!mentionedUser) {
                return await message.channel.send('Please mention a user to start a checkers game with.');
            }

            if (mentionedUser.bot) {
                return await message.channel.send('You cannot play checkers with a bot.');
            }

            if (mentionedUser.id === message.author.id) {
                return await message.channel.send('You cannot play checkers with yourself.');
            }

            const authorInGame = await isPlayerInGame(message.author.id);
            const mentionedUserInGame = await isPlayerInGame(mentionedUser.id);

            if (authorInGame || mentionedUserInGame) {
                return await message.channel.send('One or both players are already in a game.');
            }

            const participants = new Map();
            participants.set(message.author.id, message.author.username);
            participants.set(mentionedUser.id, mentionedUser.username);

            await checkersGame.startCheckersGame(message, participants);
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
            if (!isAdmin(message.member) && userId !== lila) {
                await message.channel.send('not admin')
                return;
            }

            const valid = await isValidGptRoleId(userId);
            const gptChannelDoc = await logChannels.findOne({ guildId: message.guild.id });
            const gptDrawChannelId = gptChannelDoc ? gptChannelDoc.gptDrawChannelId : null;

            if (!gptDrawChannelId || message.channel.id !== gptDrawChannelId) {
                if (userId !== saecro) {
                    const channelMention = gptDrawChannelId ? `<#${gptDrawChannelId}>` : 'the specified channel';
                    return await message.channel.send(`The \`!gptdraw\` command can only be used in ${channelMention}.`);
                }
            }

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
            if (userId !== saecro || userId !== lila) {
                cooldowns.gptdraw.set(userId, now);
                setTimeout(() => cooldowns.gptdraw.delete(userId), cooldownAmount);
            }
            const prompt = args.slice(1).join(' ');
            if (prompt) {
                try {
                    await message.channel.sendTyping();

                    const useAiPrompt = await askYesNoQuestion(message.channel, 'Use AI prompt enhancement? (yes/no)', message.author);

                    let modifiedPrompt = prompt;
                    if (useAiPrompt) {
                        modifiedPrompt = await updatePrompt(prompt);
                    }

                    const data = await drawWithAssistant(modifiedPrompt, userId);

                    if (data === 'PROMPT FAILED, PLEASE RETRY.') {
                        return await message.channel.send(data)
                    }

                    if (data.error) {
                        throw new Error(data.error.message);
                    }
                    const base64Image = data.imageData;
                    const newPrompt = data.updatedDetail;
                    console.log(newPrompt);

                    const row1 = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton U1_${userId}`)
                                .setLabel('U1')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton U2_${userId}`)
                                .setLabel('U2')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton U3_${userId}`)
                                .setLabel('U3')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton U4_${userId}`)
                                .setLabel('U4')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton 🔄_${userId}`)
                                .setLabel('🔄')
                                .setStyle(Discord.ButtonStyle.Danger),
                        );

                    const row2 = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton V1_${userId}`)
                                .setLabel('V1')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton V2_${userId}`)
                                .setLabel('V2')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton V3_${userId}`)
                                .setLabel('V3')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton V4_${userId}`)
                                .setLabel('V4')
                                .setStyle(Discord.ButtonStyle.Primary),
                        );

                    if (base64Image) {
                        await message.channel.send('prompt:``' + newPrompt + '``');
                        await message.channel.send({
                            files: [{
                                attachment: Buffer.from(base64Image, 'base64'),
                                name: 'drawn_image.png'
                            }], components: [row1, row2]
                        });
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
                await message.channel.send({ files: [attachment] });
            } else {
                // If the file does not exist, send an error message
                await message.channel.send('The file `teaserimage.jpg` does not exist in the directory.');
            }
        } else if (command === '!rape') {
            try {
                let mentionedUser = message.mentions.users.first();
                let desc = `<@${mentionedUser.id}> has been raped!`;
                if (!mentionedUser) {
                    return await message.channel.send("Please mention a valid user.");
                }

                if (mentionedUser.id === '1242601206627434708') {
                    return await message.channel.send("you can't rape the bot nigga.")
                }

                if (mentionedUser) {

                    console.log(mentionedUser.id, userId)
                    if (mentionedUser.id !== userId) {
                        if (mentionedUser.id === saecro) {
                            desc = `Saecro cannot be raped. but he can counter rape you!\nSaecro just **__*ULTRA RAPED*__** <@${userId}>`
                        }
                        if (mentionedUser.id === '665804779141726221' || userId === saecro) {
                            desc = `<@${mentionedUser.id}> has been **EXTRA** raped`
                        }
                        const randomGifPath = getRandomGif();
                        const embed = new Discord.EmbedBuilder()
                            .setDescription(desc)
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
                        return await message.channel.send(`<@${userId}> you can't rape yourself 😭😭, go masturbate.`)
                    }
                } else {
                    return await message.channel.send('you need to rape someone.')
                }
            } catch (e) {
                console.log('something happened')
            }
        } else if (command === '!aura') {
            console.log('getting aura');
            const aura = await getAura(message.author.id, message.guild.id);
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

            const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
            const now = Date.now();

            if (userCurrency.lastDonationTime && (now - userCurrency.lastDonationTime) < twoHours) {
                const timeLeft = twoHours - (now - userCurrency.lastDonationTime);
                const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
                return await message.channel.send(`You can donate again in ${minutes} minutes.`);
            }

            await currencyCollection.updateOne(
                { discordID: message.author.id },
                { $inc: { money: -amount }, $set: { lastDonationTime: now } }
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

            try {
                let userNotes = await notesCollection.findOne({ userId });

                if (!userNotes) {
                    userNotes = { userId, notes: [] };
                }

                userNotes.notes.push(note);

                await notesCollection.updateOne(
                    { userId },
                    { $set: { notes: userNotes.notes } },
                    { upsert: true }
                );

                await message.channel.send('Your note has been saved.');
            } catch (error) {
                console.error('Error saving note:', error);
                await message.channel.send('Failed to save your note.');
            }
        } else if (command === '!resetmoney') {
            if (message.author.id === saecro) {
                currencyCollection.deleteMany({});
                return await message.channel.send('deleted all records on Database.');
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

                if (executeCommand === 'pm2 logs') {
                    const outLogFile = `C:\\Users\\indrit\\.pm2\\logs\\app-name-out.log`;
                    const errorLogFile = `C:\\Users\\indrit\\.pm2\\logs\\app-name-error.log`;

                    const tailOutCommand = `powershell -command "Get-Content ${outLogFile} -Tail 20"`;
                    const tailErrorCommand = `powershell -command "Get-Content ${errorLogFile} -Tail 20"`;

                    exec(tailOutCommand, async (outError, outStdout, outStderr) => {
                        if (outError) {
                            await message.channel.send(`\`\`\`Error: ${outError.message}\`\`\``);
                            return;
                        }
                        if (outStderr) {
                            await message.channel.send(`\`\`\`Standard Output Stderr: ${outStderr}\`\`\``);
                            return;
                        }
                        exec(tailErrorCommand, async (errError, errStdout, errStderr) => {
                            if (errError) {
                                await message.channel.send(`\`\`\`Error: ${errError.message}\`\`\``);
                                return;
                            }
                            if (errStderr) {
                                await message.channel.send(`\`\`\`Error Stderr: ${errStderr}\`\`\``);
                                return;
                            }

                            await message.channel.send(`\`\`\`Standard Output Logs:\n${outStdout}\`\`\`\n\`\`\`Error Logs:\n${errStdout}\`\`\``);
                        });
                    });

                } else {
                    exec(executeCommand, async (error, stdout, stderr) => {
                        if (error) {
                            await message.channel.send(`\`\`\`Error: ${error.message}\`\`\``);
                            return;
                        }
                        if (stderr) {
                            await message.channel.send(`\`\`\`Standard Error: ${stderr}\`\`\``);
                            return;
                        }
                        await message.channel.send(`\`\`\`${stdout}\`\`\``);
                    });
                }
            }
        } else if (command === '!notes') {
            if (isAdmin(message.member)) {
                await sendNotesEmbeds(message.channel);
            }
        } else if (command === '!forget') {
            if (userId === saecro) {
                await aiMessages.deleteMany({})
                await message.channel.send('history reset for AI')
            }
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
            if (userId === saecro) {
                await message.channel.send('Nuking the server...')
            }
        } else if (command === '!ping') {
            const sent = await message.channel.send('Pong!');
            const latency = sent.createdTimestamp - message.createdTimestamp;
            sent.edit(`Pong! Latency is ${latency}ms. API Latency is ${Math.round(client.ws.ping)}ms.`);
        } else if (command === '!startsudoku') {
            const args = message.content.split(' ');
            if (args[1]) {
                const difficulty = args[1];
                await sudokuGame.startGame(message, difficulty);
            } else {
                await message.channel.send('You need to specify the difficulty: `!startsudoku easy | medium | hard | expert`')
            }
        } else if (command === '!convert') {
            const args = message.content.split(' ').slice(1);
            if (args.length === 0) {
                const currencies = await getSupportedCurrencies();
                message.reply(`Supported currencies: ${currencies.join(', ')}`);
                return;
            }

            if (args.length !== 3) {
                message.reply('Usage: !convert <from_currency> <to_currency> <amount>');
                return;
            }

            const [fromCurrency, toCurrency, amount] = args;
            const rate = await getConversionRate(fromCurrency.toUpperCase(), toCurrency.toUpperCase());

            if (rate) {
                const convertedAmount = (parseFloat(amount) * rate).toFixed(2);
                message.reply(`${amount} ${fromCurrency.toUpperCase()} is equal to ${convertedAmount} ${toCurrency.toUpperCase()}`);
            } else {
                message.reply('Could not fetch conversion rate. Please try again.');
            }
        } else if (command === '!say') {
            message.delete()
            if (userId === saecro) {
                if (!message.content.replace('!say', '').trim()) {
                    return await message.channel.send('please say something')
                }
                await message.channel.send(message.content.replace('!say ', ''))
            }
        } else if (command === '!roleinfo') {
            const args = message.content.split(' ');
            const roleId = args[1];

            if (!roleId) {
                return await message.channel.send('Please provide a role ID.');
            }

            const role = message.guild.roles.cache.get(roleId);

            if (!role) {
                return await message.channel.send('Role not found.');
            }

            const roleMembers = message.guild.members.cache.filter(member => member.roles.cache.has(role.id)).size;

            const roleInfoEmbed = {
                color: role.color,
                title: `Role Info: ${role.name}`,
                fields: [
                    { name: 'Role ID', value: role.id, inline: true },
                    { name: 'Name', value: role.name, inline: true },
                    { name: 'Color', value: role.hexColor, inline: true },
                    { name: 'Members with this Role', value: roleMembers.toString(), inline: true },
                    { name: 'Position', value: role.position.toString(), inline: true },
                    { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true }
                ],
                timestamp: new Date(),
                footer: {
                    text: `Requested by ${message.author.tag}`
                }
            };

            await message.channel.send({ embeds: [roleInfoEmbed] });
        } else if (command === '!startroulette') {
            await rouletteGame.startRouletteGame(client, message);
        } else if (command === '!autodelete') {
            if (isAdmin(message.member)) {
                const userMention = message.mentions.users.first();

                if (!userMention) {
                    let Description = '';
                    try {
                        const autodeletedUsers = await autoDeleteCollection.find({ guildId: message.guild.id }).toArray();
                        if (autodeletedUsers.length > 0) {
                            autodeletedUsers.forEach((user, index) => {
                                Description += `${index + 1}. <@${user.userId}>\n`;
                            });
                        } else {
                            Description = 'No users being auto-deleted';
                        }
                    } catch (e) {
                        Description = 'Failed to retrieve auto-deleted users';
                    }

                    const embed = new Discord.EmbedBuilder()
                        .setTitle('Auto-deleted Users')
                        .setDescription(Description)
                        .setColor('#ff0000');

                    return await message.channel.send({ embeds: [embed] });
                }

                const userId = userMention.id;
                const guildId = message.guild.id;

                // Check if there's an active auto-delete for this user
                const existingEntry = await autoDeleteCollection.findOne({ userId, guildId });

                if (existingEntry) {
                    // If the user already has an auto-delete, remove it (undelete)
                    await autoDeleteCollection.deleteOne({ userId, guildId });
                    return message.reply(`Auto-delete disabled for <@${userId}>.`);
                }

                // Parse the optional time argument (e.g., "1h" for 1 hour)
                let expiresAt = null;
                if (args[2]) {
                    const time = parseTime(args[2]);
                    if (time) {
                        expiresAt = new Date(Date.now() + time);
                    } else {
                        return message.reply('Invalid time format. Use "1h" for 1 hour, "30m" for 30 minutes, etc.');
                    }
                }

                // Store the auto-delete information in the database
                await autoDeleteCollection.insertOne({
                    userId,
                    guildId,
                    expiresAt
                });

                const timeFormatter = (date) => {
                    return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
                };

                message.reply(`Auto-delete enabled for <@${userId}>${expiresAt ? ` until ${timeFormatter(expiresAt)}` : ''}.`);

                // If there's a timer, set it up to automatically remove the entry
                if (expiresAt) {
                    setTimeout(async () => {
                        await autoDeleteCollection.deleteOne({ userId, guildId });
                        const guild = client.guilds.cache.get(guildId);
                        const user = await client.users.fetch(userId);
                        if (guild && user) {
                            const channel = guild.systemChannel || guild.channels.cache.find(channel => channel.type === 'GUILD_TEXT');
                            if (channel) {
                                channel.send(`Auto-delete expired for <@${userId}>.`);
                            }
                        }
                    }, expiresAt - Date.now());
                }
            }
        } else if (command === '!ban') {
            if (await checkRolePermission(message, 'ban_members')) {
                const userToBan = message.mentions.members.first();

                if (!userToBan) {
                    return message.channel.send('Please mention a valid user to ban.');
                }

                const reason = message.content.split(' ').slice(2).join(' ') || 'No reason provided';

                // Prefix for the ban reason
                const banPrefix = `Banned by ${message.author.displayName} - `;
                const maxReasonLength = 500 - banPrefix.length;

                // Trim the reason if it exceeds the allowed length
                const trimmedReason = reason.length > maxReasonLength ? reason.slice(0, maxReasonLength) : reason;

                try {
                    await userToBan.ban({
                        reason: `${banPrefix}${trimmedReason}`
                    });
                    message.channel.send(`${userToBan.user.tag} has been banned.`);
                } catch (err) {
                    console.error('Error banning user:', err); // Optional: log the error for debugging
                    message.channel.send(`Failed to ban ${userToBan.user.tag}.`);
                }
            } else {
                message.channel.send('You do not have permission to use this command.');
            }
        } else if (command === '!unban') {

        } else if (command === '!lockdown' && checkRolePermission(message, 'administrator')) {
            if (!memberRole) {
                return message.channel.send('No role found in the server.');
            }

            message.guild.channels.cache.forEach(async (channel) => {
                if (channel.isTextBased() && !channelsToSkip.includes(channel.id)) {
                    console.log('overwriting')
                    await channel.permissionOverwrites.edit(everyoneRole, {
                        SendMessages: false
                    });
                }
            });

            message.channel.send('🔒 The server is now in lockdown. All members have been locked from typing.');
        } else if (command === '!removelockdown' && checkRolePermission(message, 'administrator')) {
            if (!memberRole) {
                return message.channel.send('No "Member" role found in the server.');
            }

            message.guild.channels.cache.forEach(async (channel) => {
                if (channel.isTextBased() && !channelsToSkip.includes(channel.id)) {
                    await channel.permissionOverwrites.edit(everyoneRole, {
                        SendMessages: null // Resets to the default state
                    });
                }
            });

            message.channel.send('🔓 The lockdown has been lifted. Members can now type again.');
        } else if (command === '!boosterrole' || command === '!br') {
            if (!message.member.premiumSince) {
                return message.reply('This command is only for server boosters.');
            }

            const subcommand = args[1];
            let boosterRoleData = await boosterRolesCollection.findOne({ userId: message.member.id, guildId: message.guild.id });

            // Fetch the actual role from the guild if the role is found in the database
            let boosterRole = boosterRoleData ? message.guild.roles.cache.get(boosterRoleData.roleId) : null;

            if (['remove', 'icon', 'rename'].includes(subcommand)) {
                if (!boosterRole) {
                    if (boosterRoleData) {
                        // If the role is missing in the guild but present in the database, clean up the database entry
                        await boosterRolesCollection.deleteOne({ userId: message.member.id, guildId: message.guild.id });
                    }
                    return message.reply('You need to first create a role using `!br hexcode name`.');
                }
            }

            switch (subcommand) {
                case 'list':
                    const boosterRoles = await boosterRolesCollection.find({ guildId: message.guild.id }).toArray();
                    if (boosterRoles.length === 0) {
                        return message.reply('No booster roles found in this server.');
                    }

                    const pageSize = 10;
                    let currentIndex = 0;

                    function createRoleEmbed(index) {
                        const slicedRoles = boosterRoles.slice(index, index + pageSize);
                        const embed = new Discord.EmbedBuilder()
                            .setTitle('Booster Roles')
                            .setColor('#5865F2')
                            .setDescription(slicedRoles.map((role, idx) => `${index + idx + 1}. <@&${role.roleId}>`).join('\n'))
                            .setFooter({ text: `Page ${Math.floor(index / pageSize) + 1} of ${Math.ceil(boosterRoles.length / pageSize)}` });
                        return embed;
                    }

                    const row = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId('prev')
                                .setLabel('←')
                                .setStyle(Discord.ButtonStyle.Primary)
                                .setDisabled(currentIndex === 0),
                            new Discord.ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('→')
                                .setStyle(Discord.ButtonStyle.Primary)
                                .setDisabled(currentIndex + pageSize >= boosterRoles.length)
                        );

                    const roleEmbed = createRoleEmbed(currentIndex);
                    const listMessage = await message.channel.send({ embeds: [roleEmbed], components: [row] });

                    const filter = i => i.user.id === message.author.id;
                    const collector = listMessage.createMessageComponentCollector({ filter, time: 60000 });

                    collector.on('collect', async i => {
                        if (i.customId === 'prev' && currentIndex > 0) {
                            currentIndex -= pageSize;
                        } else if (i.customId === 'next' && currentIndex + pageSize < boosterRoles.length) {
                            currentIndex += pageSize;
                        }

                        await i.update({
                            embeds: [createRoleEmbed(currentIndex)],
                            components: [
                                new Discord.ActionRowBuilder()
                                    .addComponents(
                                        new Discord.ButtonBuilder()
                                            .setCustomId('prev')
                                            .setLabel('←')
                                            .setStyle(Discord.ButtonStyle.Primary)
                                            .setDisabled(currentIndex === 0),
                                        new Discord.ButtonBuilder()
                                            .setCustomId('next')
                                            .setLabel('→')
                                            .setStyle(Discord.ButtonStyle.Primary)
                                            .setDisabled(currentIndex + pageSize >= boosterRoles.length)
                                    )
                            ]
                        });
                    });

                    collector.on('end', () => {
                        listMessage.edit({ components: [] });
                    });
                    break;

                case 'icon':
                    const iconArg = args[2];
                    const attachment = message.attachments.first();

                    if (attachment) {
                        await boosterRole.setIcon(attachment.url);
                    } else if (iconArg && iconArg.startsWith('<:') && iconArg.endsWith('>')) {
                        const emojiId = iconArg.split(':')[2].replace('>', '');
                        const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
                        await boosterRole.setIcon(emojiUrl);
                    } else {
                        message.reply('Please provide either an attachment or a valid custom emoji.');
                    }
                    break;

                case 'rename':
                    const newName = args.slice(2).join(' ');
                    if (!newName) return message.reply('Please provide a new name.');
                    await boosterRole.setName(newName);
                    await message.reply('Your booster role has been renamed to ' + newName + '.');
                    break;

                case 'remove':
                    await boosterRole.delete();
                    await boosterRolesCollection.deleteOne({ userId: message.member.id, guildId: message.guild.id });
                    await message.reply('Your booster role has been deleted.');
                    break;

                default:
                    let hexCode = args[1];
                    let roleName = args.slice(2).join(' ');

                    if (!/^#?[0-9A-Fa-f]{6}$/.test(hexCode)) {
                        // Load colours.json if the input is not a hex code and check for matching color names
                        const colours = JSON.parse(fs.readFileSync(path.join(__dirname, 'colours.json'), 'utf8'));
                        const colorNames = colours.map(color => color.bestName.toLowerCase());

                        // Use string similarity to find the closest match
                        const bestMatch = stringSimilarity.findBestMatch(hexCode.toLowerCase(), colorNames);

                        if (bestMatch.bestMatch.rating >= 0.6) { // Threshold for accepting a close match
                            const matchedColor = colours.find(color => color.bestName.toLowerCase() === bestMatch.bestMatch.target);
                            hexCode = matchedColor.hexCode;
                        } else {
                            // If no match, generate a hash from the input text to create a color
                            const hash = crypto.createHash('md5').update(hexCode).digest('hex');
                            hexCode = `#${hash.slice(0, 6)}`;
                        }
                    }
                    if (!hexCode.startsWith('#')) {
                        hexCode = '#' + hexCode;
                    }

                    if (!boosterRole) {
                        if (!roleName) {
                            roleName = message.member.displayName;
                        }

                        boosterRole = await message.guild.roles.create({
                            name: roleName,
                            color: hexCode,
                            permissions: [],
                            mentionable: false,
                            reason: `Custom role for ${message.member.displayName} as a server booster`
                        });

                        await message.member.roles.add(boosterRole);

                        await boosterRolesCollection.insertOne({
                            userId: message.member.id,
                            guildId: message.guild.id,
                            roleId: boosterRole.id
                        });

                        const baseRoleData = await baseRoleCollection.findOne({ guildId: message.guild.id });
                        if (baseRoleData) {
                            const baseRole = message.guild.roles.cache.get(baseRoleData.baseRoleId);
                            if (baseRole) {
                                await boosterRole.setPosition(baseRole.position + 1)
                            }
                        }
                        await message.reply(`Created new role: <@&${boosterRole.id}>.`)
                    } else {
                        if (roleName) {
                            await boosterRole.edit({ color: hexCode, name: roleName });
                        } else {
                            await boosterRole.edit({ color: hexCode });
                        }

                        if (!message.member.roles.cache.has(boosterRole.id)) {
                            await message.member.roles.add(boosterRole);
                        }
                        await message.reply(`Updated role: <@&${boosterRole.id}>.`)
                    }

                    break;
            }
        } else if (message.content.startsWith('!baserole')) {
            const roleIdentifier = args[1];
            const baseRole = message.mentions.roles.first() ||
                message.guild.roles.cache.get(roleIdentifier) ||
                message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleIdentifier.toLowerCase()));

            if (!baseRole) return message.reply('Please mention a valid role.');

            // Save the base role in the database
            await baseRoleCollection.updateOne(
                { guildId: message.guild.id },
                { $set: { baseRoleId: baseRole.id } },
                { upsert: true }
            );

            message.reply(`Set ${baseRole.name} as the base role for this server.`);

            // Update existing booster roles to be above the base role
            const boosterRoles = await boosterRolesCollection.find({ guildId: message.guild.id }).toArray();

            boosterRoles.forEach(async (boosterRole) => {
                const role = message.guild.roles.cache.get(boosterRole.roleId);
                if (role) {
                    await role.setPosition(baseRole.position + 1)
                }
            });
        } else if (command === '!lock') {
            await message.channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false
            });
            await message.channel.send(`locked **${message.channel.name}**.`)
        } else if (command === '!unlock') {
            await message.channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null
            });
            await message.channel.send(`unlocked **${message.channel.name}**.`)
        } else if (command === '!reset') {
            const channel = message.channel;
            const channelName = channel.name;
            const parentCategory = channel.parent; // Get the category (parent) the channel is in
            const channelPosition = channel.position;
            const channelPermissions = channel.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                allow: overwrite.allow.toArray(),
                deny: overwrite.deny.toArray()
            }));

            // Save the channel data before deleting it
            const channelData = {
                name: channelName,
                parent: parentCategory,
                permissions: channelPermissions,
                type: channel.type, // Saves the channel type (text, voice, etc.)
                topic: channel.topic,
                nsfw: channel.nsfw,
                rateLimitPerUser: channel.rateLimitPerUser, // Slow mode setting
            };

            // Delete the channel
            await channel.delete();

            // Recreate the channel in the same category
            const newChannel = await message.guild.channels.create({
                name: channelData.name,
                type: channelData.type,
                topic: channelData.topic,
                nsfw: channelData.nsfw,
                rateLimitPerUser: channelData.rateLimitPerUser,
                permissionOverwrites: channelData.permissions,
                parent: channelData.parent, // Set the category (parent)
            });

            // Adjust the position of the channel
            await newChannel.setPosition(channelPosition);

            // Send the reset message in the new channel
            newChannel.send(`reset **${channelName}**`);
        } else if (command === '!purge') {
            if (!checkRolePermission(message, 'manage_messages')) {
                return message.reply('You do not have permission to use this command.');
            }

            // Split the message content into arguments
            const args = message.content.split(' ');

            // Make sure the command has a valid number argument
            const amount = parseInt(args[1]);

            if (isNaN(amount) || amount < 1 || amount > 100) {
                return message.reply('Please provide a number between 1 and 100.');
            }

            try {
                // Bulk delete the messages
                await message.channel.bulkDelete(amount + 1, true); // +1 to include the command message itself
                message.channel.send(`Successfully deleted ${amount} messages.`).then((msg) => {
                    setTimeout(() => msg.delete(), 5000); // Deletes the confirmation message after 5 seconds
                });
            } catch (error) {
                console.error(error);
                message.channel.send('There was an error trying to purge messages in this channel!');
            }
        } else if (command === '!fakepermission' || command === '!fp') {
            if (userId === message.guild.ownerId) {

                const action = args[2]; // 'grant' or 'revoke'
                const permission = args[3]; // Permission being granted or revoked
                const roleIdentifier = args[1]; // Role mention, ID, or name


                console.log(action, permission, args)
                if (!['grant', 'revoke'].includes(action) || !validPermissions.includes(permission)) {
                    return message.channel.send(`Usage: \`!fakepermission <@role/id/name> grant/revoke <${validPermissions.join(' | ')}>\``);
                }

                // Resolve role based on mention, ID, or name
                let role = message.mentions.roles.first() ||
                    message.guild.roles.cache.get(roleIdentifier) ||
                    message.guild.roles.cache.find(r => r.name.toLowerCase() === roleIdentifier.toLowerCase());

                if (!role) {
                    return message.channel.send('Role not found. Please provide a valid role mention, ID, or name.');
                }

                const guildId = message.guild.id;
                const roleId = role.id;
                const commandPermissionsCollection = database.collection('CommandPermissions');

                // Add or remove the role's permission for the specified command
                if (action === 'grant') {
                    await commandPermissionsCollection.updateOne(
                        { guildId, command: permission },
                        { $addToSet: { allowedRoles: roleId } },
                        { upsert: true }
                    );
                    message.channel.send(`Granted ${role.name} the \`${permission}\` permission.`);
                } else if (action === 'revoke') {
                    await commandPermissionsCollection.updateOne(
                        { guildId, command: permission },
                        { $pull: { allowedRoles: roleId } }
                    );
                    message.channel.send(`Revoked the \`${permission}\` permission from ${role.name}.`);
                }
            }
        } else if (command === '!fpconfig') {
            const embed = new Discord.EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('Valid Permissions')
                .setDescription(validPermissions.map(permission => `- \`${permission}\``).join('\n'))
                .setTimestamp()
                .setFooter({ text: 'Permission List' });

            await message.channel.send({ embeds: [embed] })
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.customId.startsWith('drawButton')) {
        try {
            await interaction.deferUpdate();
            const buttonID = interaction.customId.replace('drawButton ', '').split('_')[0];
            let buttonLabel;

            if (['upscaleSubtle', 'upscaleCreative', 'varySubtle', 'varyStrong', 'varyRegion', 'zoomOut2x', 'zoomOut1.5x', 'leftArrow', 'rightArrow', 'upArrow', 'downArrow'].includes(buttonID)) {
                const button = interaction.component;
                buttonLabel = button.label;
            } else {
                buttonLabel = buttonID;
            }

            if (['U1', 'U2', 'U3', 'U4'].includes(buttonID)) {
                const data = await updateWithAssistant(interaction.user.id, buttonLabel);
                if (data === 'PROMPT FAILED, PLEASE RETRY.') {
                    return await message.channel.send(data)
                }
                if (data.error) {
                    throw new Error(data.error.message);
                }

                const base64Image = data.imageData;
                if (base64Image) {
                    const row1 = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton upscaleSubtle_${interaction.user.id}`)
                                .setLabel('Upscale (Subtle)')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton upscaleCreative_${interaction.user.id}`)
                                .setLabel('Upscale (Creative)')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton varySubtle_${interaction.user.id}`)
                                .setLabel('Vary (Subtle)')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton varyStrong_${interaction.user.id}`)
                                .setLabel('Vary (Strong)')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton varyRegion_${interaction.user.id}`)
                                .setLabel('Vary (Region)')
                                .setStyle(Discord.ButtonStyle.Primary)
                        );

                    const row2 = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton zoomOut2x_${interaction.user.id}`)
                                .setLabel('Zoom Out 2x')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton zoomOut1.5x_${interaction.user.id}`)
                                .setLabel('Zoom Out 1.5x')
                                .setStyle(Discord.ButtonStyle.Primary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton leftArrow_${interaction.user.id}`)
                                .setLabel('⬅️')
                                .setStyle(Discord.ButtonStyle.Secondary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton rightArrow_${interaction.user.id}`)
                                .setLabel('➡️')
                                .setStyle(Discord.ButtonStyle.Secondary)
                        );

                    const row3 = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton upArrow_${interaction.user.id}`)
                                .setLabel('⬆️')
                                .setStyle(Discord.ButtonStyle.Secondary),
                            new Discord.ButtonBuilder()
                                .setCustomId(`drawButton downArrow_${interaction.user.id}`)
                                .setLabel('⬇️')
                                .setStyle(Discord.ButtonStyle.Secondary)
                        );

                    await interaction.followUp({
                        content: "Here is the updated image and new options:",
                        files: [{
                            attachment: Buffer.from(base64Image, 'base64'),
                            name: 'updated_image.png'
                        }],
                        components: [row1, row2, row3]
                    });
                } else {
                    await interaction.followUp({ content: 'Failed to update image.', ephemeral: true });
                }
            } else {
                // For V1, V2, V3, V4, keep the original buttons
                const data = await updateWithAssistant(interaction.user.id, buttonLabel);
                if (data.error) {
                    throw new Error(data.error.message);
                }

                const base64Image = data.imageData;
                if (base64Image) {
                    await interaction.followUp({
                        content: "Here is the updated image:",
                        files: [{
                            attachment: Buffer.from(base64Image, 'base64'),
                            name: 'updated_image.png'
                        }],
                        components: interaction.message.components
                    });
                } else {
                    await interaction.followUp({ content: 'Failed to update image.', ephemeral: true });
                }
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            await interaction.followUp({ content: 'Failed to process your request.', ephemeral: true });
        }
    } else if (interaction.customId.includes(interaction.user.id)) {
        console.log('\n\n')
        console.log(`[interactionCreate] Interaction received: ${interaction.customId}`);
        await sudokuGame.handleInteraction(interaction);
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
        if (this.gameType !== 'chessgame' || this.gameType !== 'checkersgame') {
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

async function loadNotes() {
    try {
        const notesCursor = await notesCollection.find({});
        const notesData = {};

        await notesCursor.forEach(doc => {
            notesData[doc.userId] = doc.notes;
        });

        return notesData;
    } catch (error) {
        console.error('Error reading notes from the database:', error);
        return {};
    }
}
async function sendNotesEmbeds(channel) {
    const notesData = await loadNotes(); // Fetch notes from the database
    const userIds = Object.keys(notesData);

    if (userIds.length === 0) {
        return;
    }

    // Create select menu options from user IDs
    const options = [];
    for (const userId of userIds) {
        let member;
        try {
            member = await channel.guild.members.fetch(userId);
        } catch (e) {
            console.log(`${userId} no longer in server`);
            continue;
        }
        const displayName = member?.nickname || member?.user.username;
        options.push({
            label: displayName,
            value: userId
        });
    }

    // Split options into multiple select menus if there are more than 25
    const rows = [];
    for (let i = 0; i < options.length; i += 25) {
        const chunk = options.slice(i, i + 25);
        const row = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.StringSelectMenuBuilder()
                    .setCustomId(`selectUser-${i / 25}`)
                    .setPlaceholder('Select a user to view notes')
                    .addOptions(chunk)
            );
        rows.push(row);
    }

    const message = await channel.send({ content: 'Select a user to view their notes:', components: rows });

    const filter = i => i.user.id === saecro; // Ensure only the user with the ID stored in 'saecro' can interact
    const collector = message.createMessageComponentCollector({ filter, idle: 60000 }); // Set to 60 seconds of inactivity

    collector.on('collect', async i => {
        if (i.customId.startsWith('selectUser')) {
            const selectedUserId = i.values[0];
            const selectedUserNotes = notesData[selectedUserId];
            const selectedUser = await client.users.fetch(selectedUserId);

            const embed = new Discord.EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`${selectedUser.username}'s Notes`)
                .setDescription(selectedUserNotes.map(note => `• ${note}`).join('\n'))
                .setFooter({ text: `Notes for ${selectedUser.username}` })
                .setTimestamp();

            await i.update({ embeds: [embed], components: rows });
        }
    });

    collector.on('end', collected => {
        message.edit({ components: [] });
    });
}