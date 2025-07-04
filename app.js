import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import partyCommand from './commands/party.js';
import teamsCommand from './commands/teams.js';
import rollCommand from './commands/roll.js';
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

// List of all the commands with SlashCommandBuilder
const commands = [
    new SlashCommandBuilder()
        .setName("party")
        .setDescription("Invite people to hop on a game")
        .addIntegerOption((option) => option
            .setName("max_players")
            .setDescription("Maximum number of players (default = 5)")
            .setRequired(false)),
    new SlashCommandBuilder()
        .setName("teams")
        .setDescription("Join the team builder")
        .addIntegerOption((option) => option
            .setName("team_count")
            .setDescription("Number of teams generated (default = 2)")
            .setRequired(false)),
    new SlashCommandBuilder()
        .setName("roll")
        .setDescription("Roll a random number")
        .addIntegerOption((option) => option
            .setName("roll_range")
            .setDescription("Range of the random number roll (default = 100)")
            .setRequired(false)),
    new SlashCommandBuilder()
        .setName("grouproll")
        .setDescription("Roll a random number with a group of people")
        .addIntegerOption((option) => option
            .setName("roll_range")
            .setDescription("Range of the random number roll (default = 100)")
            .setRequired(false)),
].map((command) => command.toJSON());

// Create new REST client using Discord API version 10
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// Register all the listed commands
(async () => {
    try {
        console.log("⌛ Starting up Kiri...");

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands,
        });

        console.log("✅ Kiri Initialized!");
    } catch (error) {
        console.error("❌ Failed to start Kiri:", error);
    }
})();

// Kiri's client init and configurations
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,         // Required for most interactions
        GatewayIntentBits.GuildMessages,  // Allows reading messages in channels
    ],
});

// Kiri's login confirmation
client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// Command event listener
client.on("interactionCreate", async (interaction) => {
    const { commandName } = interaction;
    if (!interaction.isChatInputCommand()) return;

    switch (commandName) {
        case "party":
            partyCommand.callCommand(interaction);
            break;
        case "teams":
            teamsCommand.callCommand(interaction);
            break;
        case "roll":
            rollCommand.callCommand(interaction);
            break;
        case "grouproll":
            rollCommand.callGroupCommand(interaction);
            break;
        default:
            console.log(`Unknown command: ${commandName}`);
    }
});

// Button interaction listener
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    
    switch (interaction.customId) {
        case "join_party":
            partyCommand.joinParty(interaction);
            break;
        case "join_teams":
            teamsCommand.joinTeams(interaction);
            break;
        case "create_teams":
            teamsCommand.createTeams(interaction);
            break;
        case "retry_teams":
            teamsCommand.retryTeams(interaction);
            break;
        case "join_roll":
            rollCommand.joinRoll(interaction);
            break;
        case "start_roll":
            rollCommand.startRoll(interaction);
            break;
        case "retry_roll":
            rollCommand.retryRoll(interaction);
            break;
        default:
            console.log(`Unknown button call: ${interaction.customId}`);
    }
});



// Start Kiri, after everything is set up
client.login(process.env.DISCORD_TOKEN);