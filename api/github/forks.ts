import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { parse } from 'json2csv';

dotenv.config();

const GITHUB_REPO = process.env.REPO as string;
const FORKS_DATA_FILE = path.join(__dirname, "../../public/data/github_forks.json");

// Define types for the data structures
interface ForkRecord {
    id: number;
    timestamp: string;
    count: number;
}

interface ForksDataFile {
    forks: ForkRecord[];
}

// Fetch Forks data from GitHub
export async function getForksStats(): Promise<[string, { current: number }]> {
    const previousForksCount = loadPreviousForksCount();

    try {
        const repoUrl = `https://api.github.com/repos/${GITHUB_REPO}`;
        const { data } = await axios.get(repoUrl);
        const forks = data.forks_count ?? 0;

        // Save the new Forks data
        const currentForks = {
            current: forks,
            timestamp: new Date().toISOString(),
        };

        saveForksData(currentForks);

        // Calculate percentage change
        let percentChange = "N/A";
        if (previousForksCount > 0) {
            const change = ((forks - previousForksCount) / previousForksCount) * 100;

            // If the change is exactly 0%, display 0%
            if (change === 0) {
                percentChange = "0%";
            } else if (Math.abs(change) < 0.01) {
                // If the change is too small but not exactly 0%, show < 0.01%
                percentChange = `< 0.01%`;
            } else {
                // Otherwise, display with two decimal places
                percentChange = `${change.toFixed(2)}%`;
            }
        }

        // Generate message with previous count, current count, and percentage change
        const message = `🍴 GitHub Forks:  ${previousForksCount.toLocaleString()}  >>  ${forks.toLocaleString()} (${percentChange})`;
        return [message, { current: forks }];
    } catch (error) {
        console.error("Error fetching Forks data:", error);
        return ["Error fetching Forks data", { current: 0 }];
    }
}

// Load the previous forks count (or the last record's count)
function loadPreviousForksCount(): number {
    try {
        if (fs.existsSync(FORKS_DATA_FILE)) {
            const data: ForksDataFile = JSON.parse(fs.readFileSync(FORKS_DATA_FILE, "utf8"));
            return data.forks.length > 0 ? data.forks[data.forks.length - 1].count : 0;
        }
    } catch (error) {
        console.error("Error loading previous forks count:", error);
    }
    return 0; // Return 0 if file doesn't exist or is invalid
}

// Save the current forks count as a new record in the forks array
function saveForksData(forksData: { current: number; timestamp: string }) {
    try {
        let existingData: ForksDataFile = { forks: [] };
        if (fs.existsSync(FORKS_DATA_FILE)) {
            const rawData = fs.readFileSync(FORKS_DATA_FILE, "utf8");
            existingData = JSON.parse(rawData);
        }

        // Determine the next ID
        const lastId = existingData.forks.length > 0 ? existingData.forks[existingData.forks.length - 1].id : 0;
        const newId = lastId + 1;

        const newRecord: ForkRecord = {
            id: newId,
            timestamp: forksData.timestamp,
            count: forksData.current, 
        };

        existingData.forks.push(newRecord);

        const directory = path.dirname(FORKS_DATA_FILE);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Save data as JSON
        fs.writeFileSync(FORKS_DATA_FILE, JSON.stringify(existingData, null, 2));

        // Save data as CSV
        const csvDirectory = path.join(directory, 'csv');
        if (!fs.existsSync(csvDirectory)) {
            fs.mkdirSync(csvDirectory, { recursive: true });
        }

        const csvFileName = path.join(csvDirectory, path.basename(FORKS_DATA_FILE, '.json') + '.csv');
        const csvData = parse(existingData.forks);  // Convert the forks data to CSV format
        fs.writeFileSync(csvFileName, csvData);

    } catch (error) {
        console.error("Error saving current forks count:", error);
    }
}
