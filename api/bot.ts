import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import { getTelegramStats } from "./telegram";
import { getGithubStats} from "./github";
import { getTokenStats } from "./holders";
import { getXFollowersStats } from "./followers";
import { checkMilestones, MILESTONES } from "./milestone";
import fs from "fs";
import path from "path";
import { createObjectCsvWriter } from "csv-writer";

dotenv.config();

// Set up Telegram client
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, { polling: false });
const CHAT_ID = process.env.CHAT_ID as string;

// Set up Discord client
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Intent to manage guilds
    ],
});

const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID as string;

// Login to Discord bot
discordClient.login(process.env.DISCORD_BOT_TOKEN as string);

// Function to send messages to Telegram
async function sendUpdateToTG(messages: string[]) {
    if (messages.length === 0) return;
    const fullMessage = messages.join("\n\n");
    await bot.sendMessage(CHAT_ID, fullMessage);
}

// Function to send messages to Discord
async function sendUpdateToDiscord(messages: string[]) {
    if (messages.length === 0) return;

    const fullMessage = messages.join("\n\n");
    const channel = discordClient.channels.cache.get(DISCORD_CHANNEL_ID) as TextChannel;
    if (channel) {
        await channel.send(fullMessage);
    }
}

async function sendMilestoneMessages(metric: string, milestones: number[]) {
    if (milestones.length === 0) return;

    const milestoneMessages = milestones.map(milestone => {
        return `🎉 Milestone Reached! ${metric} has hit ${milestone.toLocaleString()}!`;
    });

    for (const message of milestoneMessages) {
        // Send to Telegram
        await bot.sendMessage(CHAT_ID, message);

        // Send to Discord
        const channel = discordClient.channels.cache.get(DISCORD_CHANNEL_ID) as TextChannel;
        if (channel) {
            await channel.send(message);
        }
    }
}

// Create or update CSV file with more detailed data
async function saveToCSV(fileName: string, label: string, count: number, additionalInfo: string = "") {
    const folderPath = path.join(__dirname, "..", "data", "csv");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  
    const filePath = path.join(folderPath, fileName);
  
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "date", title: "Date" },
        { id: "label", title: "Metric Label" },
        { id: "count", title: "Count" },
      ],
      append: true, // Allows us to append data to the CSV
    });
  
    // Write data to CSV
    await csvWriter.writeRecords([
      {
        date: new Date().toISOString().split("T")[0], // Format as YYYY-MM-DD
        label: label,
        count: count,
        additionalInfo: additionalInfo,
      },
    ]);
  }

async function main() {
    try {
        // Check and send metrics (frequency based on cron job)
        const [telegramMessage, telegramCount] = await getTelegramStats();
        const [githubMessage, githubStats, isNewRelease] = await getGithubStats();
        const [tokenStats, tokenCount] = await getTokenStats();
        const [xFollowersStats, xFollowersCount] = await getXFollowersStats();

        // group messages into a list to send to Telegram as one message
        const messages = [
            githubMessage,
            telegramMessage,
            tokenStats,
            xFollowersStats
        ];

        // Save metrics to CSV 
        await saveToCSV("telegram_followers.csv", "Telegram Followers", telegramCount);
        await saveToCSV("github_stars.csv", "GitHub Stars", githubStats.stars);
        await saveToCSV("github_forks.csv", "GitHub Forks", githubStats.forks);
        await saveToCSV("token_holders.csv", "Token Holders", tokenCount);
        await saveToCSV("x_followers.csv", "X Followers", xFollowersCount);

        // Send the grouped messages to both Telegram and Discord
        await sendUpdateToTG(messages);
        await sendUpdateToDiscord(messages);

        // Check and send new rig-core version release message if a new release is available
        if (isNewRelease) {
            const releaseMessage = `🚀 New Release: Version **${githubStats.release_version}** is now available on GitHub!`;
            await bot.sendMessage(CHAT_ID, releaseMessage);
            const channel = discordClient.channels.cache.get(DISCORD_CHANNEL_ID) as TextChannel;
            if (channel) {
                await channel.send(releaseMessage);
            }
        }

        // Check and send milestone notifications if any milestones have been reached
        const telegramMilestones = checkMilestones("Telegram Members", telegramCount, MILESTONES.telegram);
        await sendMilestoneMessages("Telegram Members", telegramMilestones);

        const githubStarsMilestones = checkMilestones("GitHub Stars", githubStats.stars, MILESTONES.githubStars);
        await sendMilestoneMessages("GitHub Stars", githubStarsMilestones);

        const githubForksMilestones = checkMilestones("GitHub Forks", githubStats.forks, MILESTONES.githubForks);
        await sendMilestoneMessages("GitHub Forks", githubForksMilestones);

        const tokenHoldersMilestones = checkMilestones("Token Holders", tokenCount, MILESTONES.tokenHolders);
        await sendMilestoneMessages("Token Holders", tokenHoldersMilestones);

        const xFollowersMilestones = checkMilestones("X Followers", xFollowersCount, MILESTONES.xFollowers);
        await sendMilestoneMessages("X Followers", xFollowersMilestones);

        // Terminate the process after all messages are sent
        process.exit(0);

    } catch (error) {
        console.error("Error sending metrics:", error);
        process.exit(1);
    }
}

// Ensure the Discord bot is ready before proceeding with the main function
discordClient.once('ready', () => {
    main(); // Run the main function once Discord bot is ready
});
