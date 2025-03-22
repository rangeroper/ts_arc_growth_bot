import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import TelegramBot from "node-telegram-bot-api";
import { getTelegramStats } from "./telegram";
import { getGithubStats} from "./github";
import { getTokenStats } from "./holders";
import { getXFollowersStats } from "./followers";
import { checkAndSendMilestoneNotifications, MILESTONES } from "./milestone";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, { polling: false });
const CHAT_ID = process.env.CHAT_ID as string;

async function sendUpdateToTG(messages: string[]) {
    if (messages.length === 0) return;
    const fullMessage = messages.join("\n\n");
    await bot.sendMessage(CHAT_ID, fullMessage);
}

async function main() {
    try {
        const [telegramMessage, telegramCount] = await getTelegramStats();
        const [githubMessage, githubStats, isNewRelease] = await getGithubStats();
        const [tokenStats, tokenCount] = await getTokenStats();
        const [xFollowersStats, xFollowersCount] = await getXFollowersStats();

        const messages = [
            githubMessage,
            telegramMessage,
            tokenStats,
            xFollowersStats
        ];

        await sendUpdateToTG(messages);

        // Send a new release notification if there is a new release version
        if (isNewRelease) {
            const releaseMessage = `🚀 New Release: Version **${githubStats.release_version}** is now available on GitHub!`;
            await bot.sendMessage(CHAT_ID, releaseMessage);
        }

        await checkAndSendMilestoneNotifications("Telegram Members", telegramCount, MILESTONES.telegram, bot, CHAT_ID);
        await checkAndSendMilestoneNotifications("GitHub Stars", githubStats.stars, MILESTONES.githubStars, bot, CHAT_ID);
        await checkAndSendMilestoneNotifications("GitHub Forks", githubStats.forks, MILESTONES.githubForks, bot, CHAT_ID);
        await checkAndSendMilestoneNotifications("Token Holders", tokenCount, MILESTONES.tokenHolders, bot, CHAT_ID);
        await checkAndSendMilestoneNotifications("X Followers", xFollowersCount, MILESTONES.xFollowers, bot, CHAT_ID);
    } catch (error) {
        console.error("Error sending metrics:", error);
    }
}

main();
