import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string);
const CHAT_ID = process.env.CHAT_ID as string;
const DATA_FILE = path.join(__dirname, "../data/telegram_metrics.json");

export async function getTelegramStats(): Promise<[string, number]> {
    const previousCount = loadPreviousCount();

    try {
        // Get current member count
        const currentCount = await bot.getChatMemberCount(CHAT_ID);

        let percentChange: string;
        let increase: number;

        // If there is no previous count (first time), just display the current count
        if (previousCount === 0) {
            increase = currentCount; // For the first time, the increase is just the current count
            saveCurrentCount(currentCount); // Save the current count for the first time
            const message = `👥 Telegram Members  >>  ${currentCount.toLocaleString()}`;
            return [message, currentCount];
        } else {
            increase = currentCount - previousCount;

            // Check if there is no change, or if it's a decrease
            if (increase === 0) {
                saveCurrentCount(currentCount); // Save the current count if no change
                const message = `👥 Telegram Members  >>  ${currentCount.toLocaleString()}`;
                return [message, currentCount];
            } else if (increase < 0) {
                saveCurrentCount(currentCount); // Save the current count if decrease
                const message = `👥 Telegram Members  >>  ${currentCount.toLocaleString()}`;
                return  [message, currentCount];
            } else {
                // Calculate percentage change for positive increases
                percentChange = ((increase / previousCount) * 100).toFixed(2);
                saveCurrentCount(currentCount); // Save the current count if it's a positive increase
                const message = `👥 Telegram Members  >>  ${currentCount.toLocaleString()} (${percentChange}%)`;
                return [message, currentCount]; 
            }
        }
    } catch (error) {
        const message = "❌ Error fetching Telegram member count.";
        return [message, previousCount] // no current count, send previous count instead
    }
}

function loadPreviousCount(): number {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
            return data.count || 0; // Return the count or 0 if not found
        }
    } catch (error) {
        console.error("Error loading previous count:", error);
    }
    return 0; // Return 0 if file doesn't exist or is invalid
}

function saveCurrentCount(count: number) {
    const directory = path.join(__dirname, '..', 'data'); 
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true }); // Create the directory if it doesn't exist
    }

    const filePath = path.join(directory, 'telegram_metrics.json');
    const data = { count };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));  // Save the data to the json
}
