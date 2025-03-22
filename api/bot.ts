import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import TelegramBot from "node-telegram-bot-api";
import { getTelegramStats } from "./telegram";
import { getGithubStats} from "./github";
import { getTokenStats } from "./holders";
import { getXFollowersStats } from "./followers";

dotenv.config();

const directory = path.join(__dirname, '..', 'data'); 
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true }); // Create the directory if it doesn't exist
    }

    const MILESTONE_FILE = path.join(directory, 'milestones.json');


const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, { polling: false });
const CHAT_ID = process.env.CHAT_ID as string;

// Define milestone thresholds for each metric
const MILESTONES = {
    telegram: [10000, 15000, 20000, 25000, 30000, 50000, 75000, 100000, 125000, 150000, 175000, 200000, 225000, 250000],
    githubStars: [100, 500, 1000, 5000, 10000, 25000],
    githubForks: [50, 100, 500, 1000, 2500],
    tokenHolders: [50000, 75000, 100000, 125000, 150000, 175000, 200000, 225000, 250000, 275000, 300000],
    xFollowers: [50000, 75000, 100000, 125000, 150000, 175000, 200000, 225000, 250000, 275000, 300000]
};

// Load previous milestones from storage
function loadMilestones(): Record<string, number[]> {
    try {
        if (fs.existsSync(MILESTONE_FILE)) {
            return JSON.parse(fs.readFileSync(MILESTONE_FILE, "utf8"));
        }
    } catch (error) {
        console.error("Error reading milestones file:", error);
    }
    return {};
}

// Save updated milestones to storage
function saveMilestones(milestones: Record<string, number[]>) {
    try {
        fs.writeFileSync(MILESTONE_FILE, JSON.stringify(milestones, null, 2), "utf8");
    } catch (error) {
        console.error("Error writing milestones file:", error);
    }
}

async function checkAndSendMilestoneNotifications(metric: string, currentValue: number, milestoneList: number[]) {
    const reachedMilestones = loadMilestones(); // Load previously hit milestones

    if (!reachedMilestones[metric]) {
        reachedMilestones[metric] = [];
    }

    for (const milestone of milestoneList) {
        if (currentValue >= milestone && !reachedMilestones[metric].includes(milestone)) {
            await bot.sendMessage(CHAT_ID, `🎉 Milestone Reached! ${metric} has hit ${milestone.toLocaleString()}!`);
            
            // Mark this milestone as reached
            reachedMilestones[metric].push(milestone);
            saveMilestones(reachedMilestones);
        }
    }
}

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

        await checkAndSendMilestoneNotifications("Telegram Members", telegramCount, MILESTONES.telegram);
        await checkAndSendMilestoneNotifications("GitHub Stars", githubStats.stars, MILESTONES.githubStars);
        await checkAndSendMilestoneNotifications("GitHub Forks", githubStats.forks, MILESTONES.githubForks);
        await checkAndSendMilestoneNotifications("Token Holders", tokenCount, MILESTONES.tokenHolders);
        await checkAndSendMilestoneNotifications("X Followers", xFollowersCount, MILESTONES.xFollowers);
    } catch (error) {
        console.error("Error sending metrics:", error);
    }
}

main();
