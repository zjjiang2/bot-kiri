import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const partyTables = new Map();         // channelId -> Map(userId -> displayName)
const partyPromptMessages = new Map(); // channelId -> message object

// Party command call
async function callCommand(interaction) {
    const channelId = interaction.channelId;
    const maxPlayers = interaction.options.getInteger("max_players") || 5;

	// If there's already a prompt message remove all buttons
	const existingPrompt = partyPromptMessages.get(channelId);
	if (existingPrompt) {
		await existingPrompt.edit({
			components: [],
		}).catch(console.error);

		// Clear previous session state
		partyTables.delete(channelId);
		partyPromptMessages.delete(channelId);
	}


    const partyTable = new Map();
    partyTables.set(channelId, partyTable);

    const embed = {
        title: "✉️ Join Party",
        description: `Click to participate in the party!\n\n**Participants (0/${maxPlayers}):**\n_None yet_`,
        color: 0x3399ff,
    };

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("join_party")
            .setLabel("👍 Join Party")
            .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
        embeds: [embed],
        components: [row],
    });

    const sent = await interaction.fetchReply();

    sent.maxPlayers = maxPlayers;

    partyPromptMessages.set(channelId, sent);
}

// Check for stale command messages
async function verifyPartySession(interaction) {
	const channelId = interaction.channelId;
	const currentPrompt = partyPromptMessages.get(channelId);

	const validMessageIds = [
		currentPrompt?.id,
	];

	if (!validMessageIds.includes(interaction.message.id)) {

		const message = await interaction.message.fetch();

		await message.edit({ components: [] }).catch(console.error);

		await interaction.reply({
			content: `❗ This session has expired. Please use /party again.`,
			flags: 64,
		});

		return false; 
	}

	return true; 
}

// Join party button press
async function joinParty(interaction) {
    const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;
    const channelId = interaction.channelId;
    
    const partyTable = partyTables.get(channelId);
    const partyPromptMessage = partyPromptMessages.get(channelId);

    if (!(await verifyPartySession(interaction))) return;

    if (partyTable.has(userId)) {
        return interaction.reply({
            content: `❗ You're already in the party list, ${displayName}.`,
            flags: 64,
        });
    }

    const maxPlayers = partyPromptMessage?.maxPlayers || 5;
    partyTable.set(userId, displayName);

    await interaction.reply({
        content: `✅ ${displayName} has joined the party.`,
        flags: 64,
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