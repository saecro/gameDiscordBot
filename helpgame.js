const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const adminCommands = [
    {
        name: 'timelog',
        title: 'Help - !timelog',
        description: 'The `!timelog` command sets the log channel for timeout events.',
        usage: '`!timelog #channel`',
        steps: '1. Type `!timelog #channel` to set the specified channel as the log channel for timeout events.',
        example: '`!timelog #general`\nSets the #general channel as the log channel.'
    },
    {
        name: 'skull',
        title: 'Help - !skull',
        description: 'The `!skull` command adds or removes a role ID for skull reactions.',
        usage: '`!skull <role_id>`',
        steps: '1. Type `!skull <role_id>` to add or remove the role ID.\n2. The bot will acknowledge the addition or removal of the role ID.',
        example: '`!skull 123456789012345678`\nAdd or remove the role ID 123456789012345678 for skull reactions.'
    }
];

const gameCommands = [
    {
        name: 'startquiz',
        title: 'Help - !startquiz',
        description: 'The `!startquiz` command initiates a quiz game where participants answer questions to score points.',
        usage: '`!startquiz`',
        steps: '1. Type `!startquiz`.\n2. React with ✅ to join the game.\n3. Answer the quiz questions as they appear.\n4. The user with the most points at the end wins.',
        example: '`!startquiz`\nYou will see a prompt to join the game. React with ✅ to join and start answering the questions.'
    },
    {
        name: 'startmathgame',
        title: 'Help - !startmathgame',
        description: 'The `!startmathgame` command initiates a math game where participants solve math problems to score points.',
        usage: '`!startmathgame`',
        steps: '1. Type `!startmathgame`.\n2. React with ✅ to join the game.\n3. Answer the math questions as they appear.\n4. The user with the most points at the end wins.',
        example: '`!startmathgame`\nYou will see a prompt to join the game. React with ✅ to join and start answering the questions.'
    },
    {
        name: 'starthangman',
        title: 'Help - !starthangman',
        description: 'The `!starthangman` command initiates a hangman game where participants guess letters to form a word.',
        usage: '`!starthangman`',
        steps: '1. Type `!starthangman`.\n2. React with ✅ to join the game.\n3. Guess letters to form the word.\n4. The user with the most points at the end wins.',
        example: '`!starthangman`\nYou will see a prompt to join the game. React with ✅ to join and start guessing the letters.'
    },
    {
        name: 'startchessgame',
        title: 'Help - !startchessgame',
        description: 'The `!startchessgame` command initiates a chess game with another user.',
        usage: '`!startchessgame @user`',
        steps: '1. Type `!startchessgame @user` to mention a user to play with.\n2. Make moves using `!move <from> <to>`.\n3. Use `!resign` to resign or `!draw` to propose a draw.\n4. Promote a pawn with `!promote <choice>`.',
        example: '`!startchessgame @user`\nMention a user to start a chess game with them and begin making moves.'
    },
    {
        name: 'startblackjack',
        title: 'Help - !startblackjack',
        description: 'The `!startblackjack` command initiates a blackjack game.',
        usage: '`!startblackjack`',
        steps: '1. Type `!startblackjack`.\n2. React with ✅ to join the game.\n3. Make your bets and play your hands.\n4. The game will announce the winner at the end.',
        example: '`!startblackjack`\nYou will see a prompt to join the game. React with ✅ to join and start playing.'
    },
    {
        name: 'slots',
        title: 'Help - !slots',
        description: 'The `!slots` command initiates a slot machine game where participants bet money.',
        usage: '`!slots <bet>`',
        steps: '1. Type `!slots <bet>` to place your bet.\n2. The bot will spin the slot machine and announce the result.\n3. You will either win or lose money based on the result.',
        example: '`!slots 100`\nPlace a bet of 100 and spin the slot machine.'
    },
    {
        name: 'move',
        title: 'Help - !move',
        description: 'The `!move` command makes a move in the current chess game.',
        usage: '`!move <from> <to>`',
        steps: '1. Type `!move <from> <to>` to make a move.\n2. The bot will validate and execute the move.\n3. Continue making moves until the game ends.',
        example: '`!move e2 e4`\nMake a move from e2 to e4.'
    },
    {
        name: 'resign',
        title: 'Help - !resign',
        description: 'The `!resign` command resigns from the current chess game.',
        usage: '`!resign`',
        steps: '1. Type `!resign` to resign from the game.\n2. The bot will acknowledge your resignation and end the game.',
        example: '`!resign`\nResign from the current chess game.'
    },
    {
        name: 'draw',
        title: 'Help - !draw',
        description: 'The `!draw` command proposes a draw in the current chess game.',
        usage: '`!draw`',
        steps: '1. Type `!draw` to propose a draw.\n2. The opponent can accept or decline the draw offer.\n3. If accepted, the game ends in a draw.',
        example: '`!draw`\nPropose a draw in the current chess game.'
    },
    {
        name: 'promote',
        title: 'Help - !promote',
        description: 'The `!promote` command promotes a pawn in the current chess game.',
        usage: '`!promote <choice>`',
        steps: '1. Type `!promote <choice>` to promote a pawn.\n2. Choices are: Q (Queen), R (Rook), B (Bishop), N (Knight).\n3. The bot will execute the promotion.',
        example: '`!promote Q`\nPromote a pawn to a Queen.'
    },
    {
        name: 'endmathgame',
        title: 'Help - !endmathgame',
        description: 'The `!endmathgame` command ends the current math game.',
        usage: '`!endmathgame`',
        steps: '1. Type `!endmathgame` to end the game.\n2. The bot will announce the winner and end the game.',
        example: '`!endmathgame`\nEnd the current math game.'
    }
];

const generalCommands = [
    {
        name: 'balance',
        title: 'Help - !balance',
        description: 'The `!balance` command shows your current balance in the bot.',
        usage: '`!balance`',
        steps: '1. Type `!balance`.\n2. The bot will display your current balance.',
        example: '`!balance`\nThe bot will display your current balance.'
    },
    {
        name: 'stats',
        title: 'Help - !stats',
        description: 'The `!stats` command fetches Fortnite stats for a given username.',
        usage: '`!stats <username>`',
        steps: '1. Type `!stats <username>` to fetch stats.\n2. The bot will display the stats for the given username.',
        example: '`!stats Ninja`\nFetch and display Fortnite stats for the username Ninja.'
    },
    {
        name: 'gpt',
        title: 'Help - !gpt',
        description: 'The `!gpt` command interacts with the chatbot using the provided prompt.',
        usage: '`!gpt <prompt>`',
        steps: '1. Type `!gpt <prompt>` to interact with the chatbot.\n2. The bot will respond with a message from the chatbot.',
        example: '`!gpt How are you?`\nSend the prompt "How are you?" to the chatbot and receive a response.'
    },
    {
        name: 'gptdraw',
        title: 'Help - !gptdraw',
        description: 'The `!gptdraw` command generates an image based on the provided prompt.',
        usage: '`!gptdraw <prompt>`',
        steps: '1. Type `!gptdraw <prompt>` to generate an image.\n2. The bot will generate and send the image based on the prompt.',
        example: '`!gptdraw A sunset over the mountains`\nGenerate an image of a sunset over the mountains based on the prompt.'
    }
];


function createHelpEmbed(commands, index) {
    const command = commands[index];
    return new EmbedBuilder()
        .setTitle(command.title)
        .setColor('#00ff00')
        .setDescription(command.description)
        .addFields(
            { name: 'Usage', value: command.usage },
            { name: 'Steps', value: command.steps },
            { name: 'Example', value: command.example }
        )
        .setTimestamp()
        .setFooter({ text: `Page ${index + 1} of ${commands.length}` });
}

async function handleHelpCommand(message, commands) {
    let currentIndex = 0;

    const helpEmbed = createHelpEmbed(commands, currentIndex);
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('←')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('→')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === commands.length - 1)
        );

    const helpMessage = await message.channel.send({ embeds: [helpEmbed], components: [row] });

    const filter = i => i.user.id === message.author.id;
    const collector = helpMessage.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'prev' && currentIndex > 0) {
            currentIndex--;
        } else if (i.customId === 'next' && currentIndex < commands.length - 1) {
            currentIndex++;
        }

        await i.update({
            embeds: [createHelpEmbed(commands, currentIndex)],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('←')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentIndex === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('→')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(currentIndex === commands.length - 1)
                    )
            ]
        });
    });

    collector.on('end', collected => {
        helpMessage.edit({ components: [] });
    });
}

module.exports = {
    handleHelpCommand,
    adminCommands,
    gameCommands,
    generalCommands
};