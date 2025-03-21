import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { getTelegramStats } from "../api/telegram";
import { getGithubStats} from "../api/github";
import { getTokenStats } from "../api/holders";
import { getXFollowersStats } from "../api/followers";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, { polling: false });
const CHAT_ID = process.env.CHAT_ID as string;

async function sendUpdateToTG(messages: string[]) {
    const fullMessage = messages.join("\n\n");
    await bot.sendMessage(CHAT_ID, fullMessage);
}

async function main() {
    try {
        const telegramMessage = await getTelegramStats();
        const githubStats = await getGithubStats();
        const tokenStats = await getTokenStats();
        const xFollowersStats = await getXFollowersStats();

        const messages = [
            githubStats,
            telegramMessage,
            tokenStats,
            xFollowersStats
        ];

        await sendUpdateToTG(messages);
        console.log("Metrics sent successfully!");
    } catch (error) {
        console.error("Error sending metrics:", error);
    }
}

main();
