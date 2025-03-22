import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import TelegramBot from "node-telegram-bot-api";
import { getTelegramStats } from "./telegram";
import { getGithubStats} from "./github";
import { getTokenStats } from "./holders";
import { getXFollowersStats } from "./followers";
import { checkMilestones, MILESTONES } from "./milestone";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, { polling: false });
const CHAT_ID = process.env.CHAT_ID as string;

async function sendUpdateToTG(messages: string[]) {
    if (messages.length === 0) return;
    const fullMessage = messages.join("\n\n");
    await bot.sendMessage(CHAT_ID, fullMessage);
}

async function sendMilestoneMessages(metric: string, milestones: number[]) {
    if (milestones.length === 0) return;

    const milestoneMessages = milestones.map(milestone => {
        return `🎉 Milestone Reached! ${metric} has hit ${milestone.toLocaleString()}!`;
    });

    for (const message of milestoneMessages) {
        await bot.sendMessage(CHAT_ID, message);
    }
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

        await sendUpdateToTG(messages);

        // Check and send new rig-core version release message if a new release is available
        if (isNewRelease) {
            const releaseMessage = `🚀 New Release: Version **${githubStats.release_version}** is now available on GitHub!`;
            await bot.sendMessage(CHAT_ID, releaseMessage);
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

    } catch (error) {
        console.error("Error sending metrics:", error);
    }
}

main();
