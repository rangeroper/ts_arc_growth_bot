import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";
import { parse } from 'json2csv';

dotenv.config();

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as string;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY as string;
const DATA_FILE = path.join(__dirname, "../public/data/token_holders.json");

// Define the structure of a token holder record
interface TokenHolderRecord {
    id: number;
    timestamp: string;
    count: number;
}

// Define the structure of the overall token holders data
interface TokenHoldersData {
    holders: TokenHolderRecord[];
}

// Define the structure of the response data from the Helius API
interface HeliusResponse {
    result?: {
        token_accounts?: { owner: string }[];
        cursor?: string;
    };
    error?: { message: string };
}

// Fetch token holders count from Helius API
export async function getTokenHolders(): Promise<number> {
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

    const payload = {
        jsonrpc: "2.0",
        id: "get-holders",
        method: "getTokenAccounts",
        params: {
            mint: TOKEN_ADDRESS,
            limit: 1000,
            options: {
                showZeroBalance: false
            }
        }
    };

    const headers = { "Content-Type": "application/json" };
    const uniqueHolders = new Set<string>();
    let hasMore = true;
    let cursor: string | null = null;

    while (hasMore) {
        if (cursor) {
            (payload.params as any)["cursor"] = cursor;
        }

        try {
            const response = await axios.post<HeliusResponse>(url, payload, { headers });
            const data = response.data;

            if (data.error) {
                console.error(`API Error: ${data.error.message}`);
                return 0;
            }

            if (data.result?.token_accounts) {
                data.result.token_accounts.forEach((account: { owner: string }) => {
                    if (account.owner) uniqueHolders.add(account.owner);
                });

                cursor = data.result.cursor ?? null;
                hasMore = !!cursor;
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error("Error fetching token holders:", error);
            hasMore = false;
        }
    }

    return uniqueHolders.size;
}

// Load previous token stats from the file
function loadPreviousCount(): number {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data: TokenHoldersData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
            return data.holders.length > 0 ? data.holders[data.holders.length - 1].count : 0;
        }
    } catch (error) {
        console.error("Error loading previous token stats:", error);
    }
    return 0;
}

// Save current token stats to the file
function saveCurrentCount(count: number): void {
    try {
        let existingData: TokenHoldersData = { holders: [] };
        if (fs.existsSync(DATA_FILE)) {
            const rawData = fs.readFileSync(DATA_FILE, "utf8");
            existingData = JSON.parse(rawData);
        }

        // Determine the next ID
        const lastId = existingData.holders.length > 0 ? existingData.holders[existingData.holders.length - 1].id : 0;
        const newId = lastId + 1;

        const newRecord: TokenHolderRecord = {
            id: newId,
            timestamp: new Date().toISOString(),
            count,
        };

        existingData.holders.push(newRecord);

        const directory = path.dirname(DATA_FILE);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Save data as JSON
        fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2), "utf8");

        // Save data as CSV
        const csvDirectory = path.join(directory, 'csv');
        if (!fs.existsSync(csvDirectory)) {
            fs.mkdirSync(csvDirectory, { recursive: true });
        }

        const csvFileName = path.join(csvDirectory, path.basename(DATA_FILE, '.json') + '.csv');
        const csvData = parse(existingData.holders);
        fs.writeFileSync(csvFileName, csvData);

    } catch (error) {
        console.error("Error saving token stats:", error);
    }
}

export async function getTokenStats(): Promise<[string, number]> {
    const previousCount = loadPreviousCount();
    const currentCount = await getTokenHolders();

    saveCurrentCount(currentCount);

    // Calculate percentage change
    let percentChange = "N/A";
    if (previousCount > 0) {
        const change = ((currentCount - previousCount) / previousCount) * 100;
        
        // If the change is exactly 0%, display 0%
        if (change === 0) {
            percentChange = "0%";
        } 
        // If the change is too small to show in 2 decimal places, display "< 0.01%"
        else if (Math.abs(change) < 0.01) {
            percentChange = `< 0.01%`; // Or "< -0.01%" for negative changes
        } 
        // Otherwise, display with two decimal places
        else {
            percentChange = `${change.toFixed(2)}%`;
        }
    }

    // Generate message with previous count, current count, and percentage change
    const message = `💊 $ARC Holders:  ${previousCount.toLocaleString()}  >>  ${currentCount.toLocaleString()} (${percentChange})`;
    return [message, currentCount];
}


