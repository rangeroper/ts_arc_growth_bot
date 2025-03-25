import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string);
const CHAT_ID = process.env.CHAT_ID as string;

const DATA_FILE = path.join(__dirname, '..', 'public', 'data', 'telegram_metrics.json');

// Define the structure of a follower record
interface FollowerRecord {
    id: number;
    timestamp: string;
    count: number;
}

// Define the structure of the overall data object
interface TelegramMetricsData {
    members: FollowerRecord[];
}

// Function to fetch and return Telegram stats
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

// Load the previous count (or the last record's count)
function loadPreviousCount(): number {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data: TelegramMetricsData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
            // Get the count from the most recent record in the 'followers' array
            return data.members.length > 0 ? data.members[data.members.length - 1].count : 0;
        }
    } catch (error) {
        console.error("Error loading previous count:", error);
    }
    return 0; // Return 0 if file doesn't exist or is invalid
}

// Save the current count as a new record in the members array
function saveCurrentCount(count: number) {
    try {
        // Read the existing data
        let existingData: TelegramMetricsData = { members: [] };
        if (fs.existsSync(DATA_FILE)) {
            const rawData = fs.readFileSync(DATA_FILE, "utf8");
            existingData = JSON.parse(rawData);
        }

        // Determine the next ID
        const lastId = existingData.members.length > 0 ? existingData.members[existingData.members.length - 1].id : 0;
        const newId = lastId + 1;

        const newRecord: FollowerRecord = {
            id: newId, // Incremented ID
            timestamp: new Date().toISOString(), // ISO string for timestamp
            count,
        };

        // Append the new record to the 'members' array
        existingData.members.push(newRecord);

        // Ensure the directory exists
        const directory = path.dirname(DATA_FILE);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Write the updated data back to the file
        fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));
    } catch (error) {
        console.error("Error saving current count:", error);
    }
}
