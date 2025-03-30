import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { parse } from 'json2csv';

dotenv.config();

const GITHUB_REPO = process.env.REPO as string;
const STARS_DATA_FILE = path.join(__dirname, "../../public/data/github_stars.json");

// Define types for the data structures
interface StarRecord {
    id: number;
    timestamp: string;
    count: number;
}

interface StarsDataFile {
    stars: StarRecord[];
}

// Fetch Stars data from GitHub
export async function getStarsStats(): Promise<[string, { current: number }]> {
    const previousStarsCount = loadPreviousStarsCount();

    try {
        const repoUrl = `https://api.github.com/repos/${GITHUB_REPO}`;
        const { data } = await axios.get(repoUrl);
        const stars = data.stargazers_count ?? 0;

        // Save the new Stars data
        const currentStars = {
            current: stars,
            timestamp: new Date().toISOString(),
        };

        saveStarsData(currentStars);

        // Calculate percentage change similar to how we did for Telegram
        let percentChange = "N/A";
        if (previousStarsCount > 0) {
            const change = ((stars - previousStarsCount) / previousStarsCount) * 100;

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
        const message = `⭐️ GitHub Stars:  ${previousStarsCount.toLocaleString()}  >>  ${stars.toLocaleString()} (${percentChange})`;
        return [message, { current: stars }];
    } catch (error) {
        console.error("Error fetching Stars data:", error);
        return ["Error fetching Stars data", { current: 0 }];
    }
}

// Load the previous stars count (or the last record's count)
function loadPreviousStarsCount(): number {
    try {
        if (fs.existsSync(STARS_DATA_FILE)) {
            const data: StarsDataFile = JSON.parse(fs.readFileSync(STARS_DATA_FILE, "utf8"));
            return data.stars.length > 0 ? data.stars[data.stars.length - 1].count : 0;
        }
    } catch (error) {
        console.error("Error loading previous stars count:", error);
    }
    return 0; // Return 0 if file doesn't exist or is invalid
}

// Save the current stars count as a new record in the stars array
function saveStarsData(starsData: { current: number; timestamp: string }) {
    try {
        let existingData: StarsDataFile = { stars: [] };
        if (fs.existsSync(STARS_DATA_FILE)) {
            const rawData = fs.readFileSync(STARS_DATA_FILE, "utf8");
            existingData = JSON.parse(rawData);
        }

        // Determine the next ID
        const lastId = existingData.stars.length > 0 ? existingData.stars[existingData.stars.length - 1].id : 0;
        const newId = lastId + 1;

        const newRecord: StarRecord = {
            id: newId,
            timestamp: starsData.timestamp,
            count: starsData.current, 
        };

        existingData.stars.push(newRecord);

        const directory = path.dirname(STARS_DATA_FILE);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Save data as JSON
        fs.writeFileSync(STARS_DATA_FILE, JSON.stringify(existingData, null, 2));

        // Save data as CSV
        const csvDirectory = path.join(directory, 'csv');
        if (!fs.existsSync(csvDirectory)) {
            fs.mkdirSync(csvDirectory, { recursive: true });
        }

        const csvFileName = path.join(csvDirectory, path.basename(STARS_DATA_FILE, '.json') + '.csv');
        const csvData = parse(existingData.stars);
        fs.writeFileSync(csvFileName, csvData);

    } catch (error) {
        console.error("Error saving current stars count:", error);
    }
}
