import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { parse } from 'json2csv';

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

export async function getTelegramStats(): Promise<[string, number]> {
    const previousCount = loadPreviousCount();

    try {
        // Get current member count
        const currentCount = await bot.getChatMemberCount(CHAT_ID);

        saveCurrentCount(currentCount); // Save the updated count

        // Calculate percentage change
        let percentChange = "N/A";
        if (previousCount > 0) {
            const change = ((currentCount - previousCount) / previousCount) * 100;
            
            // If the change is exactly 0%, display 0%
            if (change === 0) {
                percentChange = "0%";
            } 
            // If the change is too small but not exactly 0%, show < 0.01%
            else if (Math.abs(change) < 0.01) {
                percentChange = `< 0.01%`;
            } 
            // Otherwise, display with two decimal places
            else {
                percentChange = `${change.toFixed(2)}%`;
            }
        }

        // Generate message with previous count, current count, and percentage change
        const message = `👥 Telegram Members:  ${previousCount.toLocaleString()}  >>  ${currentCount.toLocaleString()} (${percentChange})`;
        return [message, currentCount];

    } catch (error) {
        console.error("Error fetching Telegram member count:", error);
        return ["❌ Error fetching Telegram member count.", previousCount];
    }
}


// Load the previous count (or the last record's count)
function loadPreviousCount(): number {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data: TelegramMetricsData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
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
        let existingData: TelegramMetricsData = { members: [] };
        if (fs.existsSync(DATA_FILE)) {
            const rawData = fs.readFileSync(DATA_FILE, "utf8");
            existingData = JSON.parse(rawData);
        }

        // Determine the next ID
        const lastId = existingData.members.length > 0 ? existingData.members[existingData.members.length - 1].id : 0;
        const newId = lastId + 1;

        const newRecord: FollowerRecord = {
            id: newId,
            timestamp: new Date().toISOString(),
            count,
        };

        existingData.members.push(newRecord);

        const directory = path.dirname(DATA_FILE);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Save data as JSON
        fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));

        // Save data as CSV
        const csvDirectory = path.join(directory, 'csv');
        if (!fs.existsSync(csvDirectory)) {
            fs.mkdirSync(csvDirectory, { recursive: true });
        }

        const csvFileName = path.join(csvDirectory, path.basename(DATA_FILE, '.json') + '.csv');
        const csvData = parse(existingData.members);
        fs.writeFileSync(csvFileName, csvData);

    } catch (error) {
        console.error("Error saving current count:", error);
    }
}
