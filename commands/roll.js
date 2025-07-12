import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const rollTables = new Map();
const rollPromptMessages = new Map();
const rollRetryMessages = new Map();

// Roll command call
async function callCommand(interaction) {
	const displayName = interaction.member?.displayName || interaction.user.username;
	const maxRoll = interaction.options.getInteger("roll_range") || 100;
	
	const dice = Math.floor(Math.random() * maxRoll) + 1;

	await interaction.reply({
		content: `🎲 ${displayName} rolled: **${dice}**`,
	});
}

// GroupRoll command call
async function callGroupCommand(interaction) {
	const channelId = interaction.channelId;
	const maxRoll = interaction.options.getInteger("roll_range") || 100;

	// If there's already a prompt message remove all buttons
	const existingPrompt = rollPromptMessages.get(channelId);
	if (existingPrompt) {
		await existingPrompt.edit({
			components: [],
		}).catch(console.error);

		rollTables.delete(channelId);
		rollPromptMessages.delete(channelId);
	}

	// Clear previous retry message
	const previousRetry = rollRetryMessages.get(channelId);
	if (previousRetry) {
		await previousRetry.edit({ components: [] }).catch(console.error);
		rollRetryMessages.delete(channelId);
	}

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("join_roll")
			.setLabel("👍 Join Group Roll")
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId("start_roll")
			.setLabel(`🎲 Start Roll`)
			.setStyle(ButtonStyle.Primary),
	);
	
	const rollTable = new Map();
    rollTables.set(channelId, rollTable);

	const embed = {
      title: "🎲 Group Dice Roll",
      description: "Click to join the group roll!\n\n**Participants:**\n_None yet_",
      color: 0x99ff00,
    };

	await interaction.reply({
		embeds: [embed],
		components: [row],
	});

	const sent = await interaction.fetchReply();
	sent.maxRoll = maxRoll
	rollPromptMessages.set(channelId, sent);
}

// Check for stale command messages
async function verifyRollSession(interaction) {
	const channelId = interaction.channelId;
	const currentPrompt = rollPromptMessages.get(channelId);
	const currentRetry = rollRetryMessages.get(channelId);

	const validMessageIds = [
		currentPrompt?.id,
		currentRetry?.id,
	];

	if (!validMessageIds.includes(interaction.message.id)) {

		const message = await interaction.message.fetch();

		await message.edit({ components: [] }).catch(console.error);

		await interaction.reply({
			content: `❗ This session has expired. Please use '/grouproll' again.`,
			flags: 64,
		});

		return false; 
	}

	return true; 
}

// Start and returns the winner of the roll, along with all other rolls
function generateRollResults(rollTable, maxRoll) {
	let highest = 0;
	let winner = null;

	const results = Array.from(rollTable).map((user) => {
		let roll = Math.floor(Math.random() * maxRoll) + 1;
		if (roll > highest) {
			highest = roll;
			winner = user[1];
		}
		return { user, roll };
	});

	return { results, winner, highest };
}

// Join roll button press
async function joinRoll(interaction) {
	const userId = interaction.user.id;
    const displayName = interaction.member?.displayName || interaction.user.username;
    const channelId = interaction.channelId;
	const rollTable = rollTables.get(channelId);
    const rollPromptMessage = rollPromptMessages.get(channelId);

	if (!(await verifyRollSession(interaction))) return;

	if (rollTable.has(userId)) {
		return interaction.reply({
			content: `❗ You're already in the group list, ${displayName}.`,
			flags: 64,
		});
	}

    rollTable.set(userId, displayName);

	await interaction.reply({
		content: `✅ ${displayName} joined the group roll!`,
		flags: 64,
	});

	const participantList = Array.from(rollTable.entries())
		.map(([_, name], i) => `${i + 1}. ${name}`)
		.join("\n");

	const updatedEmbed = {
		title: "🎲 Group Dice Roll",
		description: `Click to join the group roll!\n\n**Participants:**\n${participantList}`,
      color: 0x99ff00,
	};

	await rollPromptMessage.edit({ embeds: [updatedEmbed] });
}

// Start roll button press
async function startRoll(interaction) {
	const channelId = interaction.channelId;
	const rollTable = rollTables.get(channelId);
	const rollPromptMessage = rollPromptMessages.get(channelId);
	const maxRoll = rollPromptMessage?.maxRoll || 100;

	if (!(await verifyRollSession(interaction))) return;

	if (rollTable.size === 0) {
		return interaction.reply({
			content: "❗ No one has joined the group roll yet!",
			flags: 64,
		});
	}

	if (rollPromptMessage) {
		await rollPromptMessage.edit({ components: [] }).catch(console.error);
	}

	const { results, winner, highest } = generateRollResults(rollTable, maxRoll);

	const resultText = results
      .map((r) => `🎲 **${r.user[1]}** rolled **${r.roll}**`)
      .join("\n");

	const retryButton = new ButtonBuilder()
        .setCustomId("retry_roll")
        .setLabel("🔁 Retry")
        .setStyle(ButtonStyle.Secondary);

	const retryRow = new ActionRowBuilder().addComponents(retryButton);

	const resultMessage = await interaction.reply({
      content: `**Dice Roll Results:**\n${resultText}\n\n🏆 **Winner:** ${winner} won with a **${highest}**!`,
      components: [retryRow],
	  fetchReply: true,
    });

	rollRetryMessages.set(channelId, resultMessage);
}

// Retry roll button press
async function retryRoll(interaction) {
	const channelId = interaction.channelId;
	const rollTable = rollTables.get(channelId);
	const rollPromptMessage = rollPromptMessages.get(channelId);
	const maxRoll = rollPromptMessage?.maxRoll || 100;
	const rollRetryMessage = rollRetryMessages.get(channelId);

	if (!(await verifyRollSession(interaction))) return;

	if (rollTable.size === 0) {
		return interaction.reply({
			content: "❗ No one has joined the group roll to reshuffle!",
			flags: 64,
		});
	}

	if (rollRetryMessage) {
		await rollRetryMessage.edit({ components: [] }).catch(console.error);
	}

	const { results, winner, highest } = generateRollResults(rollTable, maxRoll);
	const resultText = results
		.map((r) => `🎲 **${r.user[1]}** rolled **${r.roll}**`)
		.join("\n");

	const retryButton = new ButtonBuilder()
		.setCustomId("retry_roll")
		.setLabel("🔁 Retry Again")
		.setStyle(ButtonStyle.Secondary);

	const retryRow = new ActionRowBuilder().addComponents(retryButton);

	const newRetryMessage = await interaction.reply({
		content: `**Dice Roll Results:**\n${resultText}\n\n🏆 **Winner:** ${winner} won with a **${highest}**!`,
		components: [retryRow],
		fetchReply: true,
	});

	rollRetryMessages.set(channelId, newRetryMessage);
}


export default {
    callCommand,
	callGroupCommand,
	joinRoll,
	startRoll,
	retryRoll,
};