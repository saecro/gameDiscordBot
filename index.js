const { Client, PermissionsBitField, GatewayIntentBits, AuditLogEvent, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');
const OpenAI = require('openai');
const { handleHelpCommand, readCommandsFile } = require('./helpgame.js');

const cooldowns = {
    gpt: new Map(),
    gptdraw: new Map()
};

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const mongo = new MongoClient(process.env.MONGO_URI);
const database = mongo.db('discordGameBot');
const currencyCollection = database.collection('currency');
const logChannels = database.collection('LogChannels');
const roleCollection = database.collection('RoleIDs');
const chessGames = database.collection('chessGames');
const aiMessages = database.collection('AIMessages');
const timeoutLogs = database.collection('Timeouts');

// Game modules
const blackjackGame = require('./games/blackjackGame.js');
const slotMachineGame = require('./games/slotMachine.js');
const chessGame = require('./games/chessgame.js');
const mathGame = require('./games/mathGame.js');
const greenTea = require('./games/greentea.js');
const blackTea = require('./games/blacktea.js');
const hangMan = require('./games/hangMan.js');
const quizGame = require('./games/quiz.js');

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

function isAdmin(member) {
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
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
        user = {
            discordID: userId,
            money: 100
        };
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

async function drawWithAssistant(userMessage) {
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: userMessage,
            n: 1,
            size: "1024x1024",
        });
        const imageUrl = response.data[0].url;

        // Fetch the image data
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageData = Buffer.from(imageResponse.data, 'binary').toString('base64');

        return imageData;
    } catch (error) {
        console.error('Error generating or fetching image:', error);

        // Check if it's a content policy violation
        if (error.response && error.response.data && error.response.data.error && error.response.data.error.code === 'content_policy_violation') {
            throw new Error('This request has been blocked by our content filters.');
        }

        // For other errors, return null
        return null;
    }
}

async function getChatHistory(userId) {
    const chatHistory = await aiMessages.find({ userId })
        .sort({ createdAt: -1 })  // Sort in descending order to get the latest messages first
        .limit(7)                 // Limit the results to the last 7 messages
        .toArray();

    chatHistory.reverse();         // Reverse the array to have the messages in chronological order
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
    const roleIDs = ['list', 'of', 'role', 'IDs']; // Add your role IDs here
    const gptRole = newMember.guild.roles.cache.find(role => role.name === 'gpt');

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

    if (gptRole) {
        if (!oldMember.roles.cache.has(gptRole.id) && newMember.roles.cache.has(gptRole.id)) {
            // Check if the role was not added by the bot command
            const auditLogs = await newMember.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MemberRoleUpdate,
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
    } else if (oldMember.isCommunicationDisabled() && !newMember.isCommunicationDisabled()) {
        // Timeout was cleared
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

    const playerGames = await getPlayerGames(); // Fetch player games from the database
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
        if (command === '!exitgame') {
            if (currentGame) {
                currentGame.endGame();
                currentGame = null;
            } else {
                message.channel.send('No game is currently running.');
            }
            return;
        } else if (currentGame && command !== '!move' && command.startsWith('!start') && command !== '!startchessgame') {
            message.channel.send('A game is already in progress. Please wait for it to finish before starting a new one.');
            return;
        } else if (command === '!help') {
            const commands = await readCommandsFile();
            if (!commands) {
                return message.channel.send('Failed to load commands.');
            }

            const helpCategory = args[1] ? args[1].toLowerCase() : null;
            if (helpCategory === 'admin') {
                await handleHelpCommand(message, commands.adminCommands);
            } else if (helpCategory === 'games') {
                await handleHelpCommand(message, commands.gameCommands);
            } else if (helpCategory === 'general') {
                await handleHelpCommand(message, commands.generalCommands);
            } else {
                const sections = [
                    { name: 'Admin Commands', commands: commands.adminCommands },
                    { name: 'Game Commands', commands: commands.gameCommands },
                    { name: 'Normal Commands', commands: commands.generalCommands }
                ];

                function createSectionEmbed(section, index) {
                    return new EmbedBuilder()
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
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('prevSection')
                                .setLabel('←')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentSectionIndex === 0),
                            new ButtonBuilder()
                                .setCustomId('nextSection')
                                .setLabel('→')
                                .setStyle(ButtonStyle.Primary)
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
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId('prevSection')
                                            .setLabel('←')
                                            .setStyle(ButtonStyle.Primary)
                                            .setDisabled(currentSectionIndex === 0),
                                        new ButtonBuilder()
                                            .setCustomId('nextSection')
                                            .setLabel('→')
                                            .setStyle(ButtonStyle.Primary)
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
            if (!(from.length !== 2 || to.length !== 2)) {
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
            } else {
                message.channel.send('Invalid Choices, Please provide a move in the format: !move <from> <to>. Example: !move e2 e4')
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
        } else if (command === '!gpt') {
            const userId = message.author.id;
            const now = Date.now();
            const cooldownAmount = 60 * 1000; // 1 minute

            if (cooldowns.gpt.has(userId)) {
                const expirationTime = cooldowns.gpt.get(userId) + cooldownAmount;
                if (now < expirationTime && userId !== '805009105855971329') {
                    const timeLeft = (expirationTime - now) / 1000;
                    return message.reply(`please wait ${timeLeft.toFixed(1)} more seconds before reusing the \`!gpt\` command.`);
                }
            }

            cooldowns.gpt.set(userId, now);
            setTimeout(() => cooldowns.gpt.delete(userId), cooldownAmount);

            const prompt = args.slice(1).join(' ');
            if (prompt) {
                message.channel.sendTyping();
                const response = await chatWithAssistant(userId, prompt);
                message.channel.send(response);
            } else {
                message.channel.send('Please provide a prompt after the command.');
            }
        } else if (command === '!gptdraw') {
            const userId = message.author.id;
            const now = Date.now();
            const cooldownAmount = 60 * 1000; // 10 minutes

            if (cooldowns.gptdraw.has(userId)) {
                const expirationTime = cooldowns.gptdraw.get(userId) + cooldownAmount;
                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return message.reply(`please wait ${timeLeft.toFixed(1)} more seconds before reusing the \`!gptdraw\` command.`);
                }
            }
            if (userId !== '805009105855971329') {
                cooldowns.gptdraw.set(userId, now);
                setTimeout(() => cooldowns.gptdraw.delete(userId), cooldownAmount);
            }
            const prompt = args.slice(1).join(' ');
            if (prompt) {
                try {
                    message.channel.sendTyping();
                    const base64Image = await drawWithAssistant(prompt);
                    if (base64Image) {
                        await message.channel.send({
                            files: [{
                                attachment: Buffer.from(base64Image, 'base64'),
                                name: 'drawn_image.png'
                            }]
                        });
                    } else {
                        message.reply('Failed to generate image.');
                    }
                } catch (error) {
                    console.error('Error handling !gptdraw command:', error);
                    if (error.message === 'This request has been blocked by our content filters.') {
                        message.reply(error.message);
                    } else {
                        message.reply('Failed to process your request.');
                    }
                }
            } else {
                message.reply('Please provide a prompt after the command.');
            }
        } else if (message.content.startsWith('!gptrole')) {
            const userId = message.author.id;

            if (userId === '805009105855971329') {
                const mentionedUser = message.mentions.users.first();
                if (!mentionedUser) {
                    return message.reply('Please mention a user to assign the role to.');
                }

                const guild = message.guild;
                let role = guild.roles.cache.find(role => role.name === "gpt");

                if (!role) {
                    role = await guild.roles.create({
                        name: 'gpt',
                    });
                }

                const member = guild.members.cache.get(mentionedUser.id);
                if (member) {
                    await member.roles.add(role);
                    message.reply(`Assigned the "gpt" role to ${mentionedUser.tag}.`);

                    // Mark the user that the role was assigned by the bot
                    await member.roles.add(role, 'Role assigned by bot command');
                } else {
                    message.reply('User not found in this guild.');
                }
                return;
            } else {
                return message.reply('Only saecro has permission to use this command.');
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
                    return message.reply(`Log channel set to ${channel}`);
                } else {
                    return message.reply('Please mention a valid channel.');
                }
            } else {
                return message.reply('You do not have permission to use this command.');
            }

        } else if (command === '!skull') {
            if (isAdmin(message.member)) {
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
            } else {
                return message.reply('You do not have permission to use this command.');
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
            this.message.channel.send('No one joined the game.');
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
                message.channel.send('Invalid move, try again.');
            }
        } catch (error) {
            console.error(error);
            message.channel.send('Error making move: ' + error.message);
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
    const embed = new EmbedBuilder()
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
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(description);

    const joinMessage = await channel.send({ embeds: [embed] });
    setTimeout(() => {
        joinMessage.delete().catch(console.error);
    }, 5000); // Delete after 5 seconds
}

async function startQuizGame(message, participants) {
    message.channel.send(`Starting quiz game with: ${Array.from(participants.values()).join(', ')}`);
    await quizGame.startQuiz(message, participants);
    currentGame = null; // Game ended, reset currentGame
}

async function startMathGame(message, participants) {
    message.channel.send(`Starting math game with: ${Array.from(participants.values()).join(', ')}`);
    await mathGame.startMathGame(message, participants);
    currentGame = null; // Game ended, reset currentGame
}

async function startGreenTea(message, participants) {
    message.channel.send(`Starting greentea with: ${Array.from(participants.values()).join(', ')}`);
    await greenTea.startGreenTea(message, participants);
    currentGame = null; // Game ended, reset currentGame
}

async function startBlackTea(message, participants) {
    message.channel.send(`Starting blacktea with: ${Array.from(participants.values()).join(', ')}`);
    await blackTea.startBlackTea(message, participants);
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