import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const teamsTables = new Map(); 
const teamsPromptMessages = new Map();
const teamsRetryMessages = new Map();

// Teams command call
async function callCommand(interaction) {
	const channelId = interaction.channelId;
    const teamCount = interaction.options.getInteger("team_count") || 2;

	// If there's already a prompt message remove all buttons
	const existingPrompt = teamsPromptMessages.get(channelId);
	if (existingPrompt) {
		await existingPrompt.edit({
			components: [],
		}).catch(console.error);

		// Clear previous session state
		teamsTables.delete(channelId);
		teamsPromptMessages.delete(channelId);
	}

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

	await interaction.reply({
		embeds: [embed],
		components: [row],
	});

	const sent = await interaction.fetchReply();
	sent.teamCount = teamCount;
	teamsPromptMessages.set(channelId, sent);
}

// Check for stale command messages
async function verifyTeamsSession(interaction) {
	const channelId = interaction.channelId;
	const currentPrompt = teamsPromptMessages.get(channelId);
	const currentRetry = teamsRetryMessages.get(channelId);

	const validMessageIds = [
		currentPrompt?.id,
		currentRetry?.id,
	];

	if (!validMessageIds.includes(interaction.message.id)) {

		const message = await interaction.message.fetch();

		await message.edit({ components: [] }).catch(console.error);

		await interaction.reply({
			content: `❗ This session has expired. Please use '/teams' again.`,
			flags: 64,
		});

		return false; 
	}

	return true; 
}


// Join team button press
async function joinTeams(interaction) {
	const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;
    const channelId = interaction.channelId;
	const teamsTable = teamsTables.get(channelId);
    const teamsPromptMessage = teamsPromptMessages.get(channelId);

	if (!(await verifyTeamsSession(interaction))) return;

	if (teamsTable.has(userId)) {
        return interaction.reply({
            content: `❗ You're already in the teams list, ${displayName}.`,
            flags: 64,
        });
    }

    teamsTable.set(userId, displayName);

	await interaction.reply({
		content: `✅ ${displayName} joined the team generator!`,
		flags: 64,
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

	if (!(await verifyTeamsSession(interaction))) return;

	if (teamsTable.size === 0) {
		return interaction.reply({
			content: "❗ No one has joined the team table yet!",
			flags: 64,
		});
	}

	await teamsPromptMessage.edit({
		components: [],
	}).catch(console.error);

	const formedTeams = generateTeams(teamsTable, teamCount);
	const teamMessages = formedTeams
		.map((team, i) => `**Team ${i + 1}:** ${team.join(" & ")}`)
		.join("\n");

	const retryButton = new ButtonBuilder()
		.setCustomId("retry_teams")
		.setLabel("🔁 Retry Teams")
		.setStyle(ButtonStyle.Secondary);

	const retryRow = new ActionRowBuilder().addComponents(retryButton);

	const retryMessage = await interaction.reply({
		embeds: [{
			title: "👥 Teams Formed",
			description: `**Teams:**\n${teamMessages}`,
			color: 0xff0000,
		}],
		components: [retryRow],
		fetchReply: true,
	});

	teamsRetryMessages.set(channelId, retryMessage);
}

// Retry button press
async function retryTeams(interaction) {
	const channelId = interaction.channelId;
	const teamsTable = teamsTables.get(channelId);
	const teamCount = teamsPromptMessages.get(channelId)?.teamCount || 2;
	const teamsRetryMessage = teamsRetryMessages.get(channelId);

	if (!(await verifyTeamsSession(interaction))) return;

	if (teamsTable.size === 0) {
		return interaction.reply({
			content: "❗ No one is in the team list to reshuffle!",
			flags: 64,
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

	await teamsRetryMessage.edit({
		embeds: [{
			title: "👥 Teams Reformed",
			description: `**Teams:**\n${teamMessages}`,
			color: 0xff0000,
		}],
		components: [retryRow],
	});

	await interaction.deferUpdate(); // Clear button interaction
}

export default {
	callCommand,
	joinTeams,
	createTeams,
	retryTeams,
};
