import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string);
const CHAT_ID = process.env.CHAT_ID as string;
const DATA_FILE = path.join(__dirname, "../data/telegram_metrics.json");

export async function getTelegramStats(): Promise<string> {
    const previousCount = loadPreviousCount();

    console.log(`Previous Count: ${previousCount}`); // Log the previous count

    try {
        // Get current member count
        const currentCount = await bot.getChatMemberCount(CHAT_ID);

        console.log(`Current Count: ${currentCount}`); // Log the current count

        let percentChange: string;
        let increase: number;

        // If there is no previous count (first time), just display the current count
        if (previousCount === 0) {
            increase = currentCount; // For the first time, the increase is just the current count
            console.log(`First run, showing only current count: ${currentCount}`);
            saveCurrentCount(currentCount); // Save the current count for the first time
            return `👥 Telegram Members  >>  ${currentCount.toLocaleString()}`;
        } else {
            increase = currentCount - previousCount;

            console.log(`Increase: ${increase}`); // Log the increase

            // Check if there is no change, or if it's a decrease
            if (increase === 0) {
                console.log(`No change in member count. Showing only the current count.`);
                saveCurrentCount(currentCount); // Save the current count if no change
                return `👥 Telegram Members  >>  ${currentCount.toLocaleString()}`; // No change, just show count
            } else if (increase < 0) {
                console.log(`Decrease in member count. Showing only the current count.`);
                saveCurrentCount(currentCount); // Save the current count if decrease
                return `👥 Telegram Members  >>  ${currentCount.toLocaleString()}`; // Decreased, just show count
            } else {
                // Calculate percentage change for positive increases
                percentChange = ((increase / previousCount) * 100).toFixed(2);
                console.log(`Percentage Change: ${percentChange}%`); // Log the percentage change
                saveCurrentCount(currentCount); // Save the current count if it's a positive increase
                return `👥 Telegram Members  >>  ${currentCount.toLocaleString()} (${percentChange}%)`; // Show count and percentage
            }
        }
    } catch (error) {
        console.error("Error fetching Telegram stats:", error);
        return "❌ Error fetching Telegram member count.";
    }
}

function loadPreviousCount(): number {
    try {
        console.log(`Looking for file at: ${DATA_FILE}`); // Log the file path

        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
            console.log("Loaded data from file:", data); // Log the loaded data
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
    
    console.log(`Saving count: ${count} to file at ${filePath}`); // Log the count being saved and file path

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));  // Save the data to the json
}
