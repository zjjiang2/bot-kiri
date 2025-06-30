import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const teamsTables = new Map(); 
const teamsPromptMessages = new Map();

// Teams command call
async function callCommand(interaction) {
	const channelId = interaction.channelId;
    const teamCount = interaction.options.getInteger("team_count") || 2;

	const teamsTable = new Map();
    teamsTables.set(channelId, teamsTable);

	const embed = {
		title: "👥 Team Generator",
		description:
			"Click to join the team generator!\n\n**Participants:**\n_None yet_",
		color: 0xff0000,
	};

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("join_teams")
			.setLabel("👍 Join Teams")
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId("create_teams")
			.setLabel(`🚀 Create Teams of ${teamCount}s`)
			.setStyle(ButtonStyle.Primary),
	);

	const sent = await interaction.reply({
		embeds: [embed],
		components: [row],
		fetchReply: true,
	});

	sent.teamCount = teamCount;
	teamsPromptMessages.set(channelId, sent);
}

// Join team button press
async function joinTeams(interaction) {
	const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;
    const channelId = interaction.channelId;

	const teamsTable = teamsTables.get(channelId);
    const teamsPromptMessage = teamsPromptMessages.get(channelId);

	if (!teamsTable || !teamsPromptMessage) {
        return interaction.reply({
            content: `❗ No active teams in this channel. Start one with '/teams'.`,
            ephemeral: true,
        });
    }

	if (teamsTable.has(displayName)) {
		return interaction.reply({
			content: `❗ You're already in the teams list, ${displayName}.`,
			ephemeral: true,
		});
	}

    teamsTable.set(userId, displayName);

	await interaction.reply({
		content: `✅ ${displayName} joined the team generator!`,
		ephemeral: true,
	});


	const participantList = Array.from(teamsTable.entries())
		.map(([_, name], i) => `${i + 1}. ${name}`)
		.join("\n");

	const updatedEmbed = {
		title: "👥 Team Builder",
		description: `Click to join the team generator!\n\n**Participants:**\n${participantList}`,
		color: 0xff0000,
	};

	await teamsPromptMessage.edit({ embeds: [updatedEmbed] });
	
}

// Generate teams of -teamCount- from participants
function generateTeams(teamsTable, teamCount) {
	const participants = Array.from(teamsTable);
	const shuffled = participants.sort(() => Math.random() - 0.5);

    const teams = [];
	for (let i = 0; i < shuffled.length; i++) {
		const teamIndex = i % teamCount;
		if (!teams[teamIndex]) teams[teamIndex] = [];
		teams[teamIndex].push(shuffled[i][1]); // Use .[1] to get displayName
	}

	return teams;
}

// Create team button press
async function createTeams(interaction) {
    const channelId = interaction.channelId;
	const teamsTable = teamsTables.get(channelId);
    const teamsPromptMessage = teamsPromptMessages.get(channelId);
	const teamCount = teamsPromptMessage?.teamCount || 2;

	// Guard state access
	if (!teamsTable || !teamsPromptMessage) {
		return interaction.reply({
			content: `❗ This session has expired. Use /teams to start a new one.`,
			ephemeral: true,
		});
	}

	if (teamsTable.size === 0) {
		return interaction.reply({
			content: "❗ No one has joined the team table yet!",
			ephemeral: true,
		});
	}

	const formedTeams = generateTeams(teamsTable, teamCount);
	const teamMessages = formedTeams
		.map((team, i) => `**Team ${i + 1}:** ${team.join(" & ")}`)
		.join("\n");

	const retryRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("retry_teams")
			.setLabel("🔁 Retry Teams")
			.setStyle(ButtonStyle.Secondary)
	);

	await interaction.reply({
		content: `👥 **Teams formed:**\n${teamMessages}`,
		components: [retryRow],
	});

	if (teamsPromptMessage) {
		await teamsPromptMessage.delete().catch(console.error);
	}
}

// Retry button press
async function retryTeams(interaction) {
	const channelId = interaction.channelId;
	const teamsTable = teamsTables.get(channelId);
    const teamsPromptMessage = teamsPromptMessages.get(channelId);
    const teamCount = teamsPromptMessage?.teamCount || 2;

	if (!teamsTable || !teamsPromptMessage) {
		return interaction.reply({
			content: `❗ This session has expired. Use /teams to start a new one.`,
			ephemeral: true,
		});
	}

	if (teamsTable.size === 0) {
		return interaction.reply({
			content: "❗ No one is in the team list to reshuffle!",
			ephemeral: true,
		});
	}
	
	const formedTeams = generateTeams(teamsTable, teamCount);
	const teamMessages = formedTeams
		.map((team, i) => `**Team ${i + 1}:** ${team.join(" & ")}`)
		.join("\n");

	const retryRow = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("retry_teams")
			.setLabel("🔁 Retry Teams")
			.setStyle(ButtonStyle.Secondary)
	);

	await interaction.reply({
		content: `🔁 **Reshuffled Teams:**\n${teamMessages}`,
		components: [retryRow],
	});
}

export default {
	callCommand,
	joinTeams,
	createTeams,
	retryTeams,
};
