import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

const partyTables = new Map();         // channelId -> Map(userId -> displayName)
const partyPromptMessages = new Map(); // channelId -> message object

// Party command call
async function callCommand(interaction) {
    const channelId = interaction.channelId;
    const maxPlayers = interaction.options.getInteger("max_players") || 5;

    const partyTable = new Map();
    partyTables.set(channelId, partyTable);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("join_party")
            .setLabel("👍 Join Party")
            .setStyle(ButtonStyle.Success)
    );

    const embed = {
        title: "✉️ Join Party",
        description: `Click to participate!\n\n**Participants (0/${maxPlayers}):**\n_None yet_`,
        color: 0x3399ff,
    };

    const sent = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
    });

    sent.maxPlayers = maxPlayers;
    partyPromptMessages.set(channelId, sent);
}

// Join party button press
async function joinParty(interaction) {
    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;
    const channelId = interaction.channelId;
    
    const partyTable = partyTables.get(channelId);
    const partyPromptMessage = partyPromptMessages.get(channelId);

    if (!partyTable || !partyPromptMessage) {
        return interaction.reply({
            content: `❗ No active party in this channel. Start one with '/party'.`,
            ephemeral: true,
        });
    }

    if (partyTable.has(userId)) {
        return interaction.reply({
            content: `❗ You're already in the party list, ${displayName}.`,
            ephemeral: true,
        });
    }

    const maxPlayers = partyPromptMessage?.maxPlayers || 5;
    partyTable.set(userId, displayName);

    await interaction.reply({
        content: `✅ ${displayName} has joined the party.`,
        ephemeral: true,
    });

    const participantList = Array.from(partyTable.entries())
        .map(([_, name], i) => `${i + 1}. ${name}`)
        .join("\n");

    const updatedEmbed = {
        title: "✉️ Party Invitation",
        description: `Click to join party!\n\n**Participants (${partyTable.size}/${maxPlayers}):**\n${participantList}`,
        color: 0x3399ff,
    };

    // When full, disable button and @ all those who joined
    if (partyTable.size >= maxPlayers) {
        const mentionList = Array.from(partyTable.keys())
            .map((id) => `<@${id}>`)
            .join(", ");

        const closedRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("join_party")
                .setLabel("✅ Party Full")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

        await partyPromptMessage.edit({
            embeds: [updatedEmbed],
            components: [closedRow],
        });

        await interaction.followUp({
            content: `🎮 Party is full!\n${mentionList}, let's run it lads.`,
        });
    } else {
        await partyPromptMessage.edit({
            embeds: [updatedEmbed],
        });
    }
}

export default {
    callCommand,
    joinParty
};