const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');


const filePath = path.join(__dirname, 'commands.json');


function readCommandsFile() {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}

function createHelpEmbed(commands, index) {
    const command = commands[index];
    return new EmbedBuilder()
        .setTitle(command.title)
        .setColor('#00ff00')
        .setDescription(command.description)
        .addFields(
            { name: 'Usage', value: command.usage },
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
    readCommandsFile
};
