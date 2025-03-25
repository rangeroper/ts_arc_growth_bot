import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";

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
        token_accounts?: { owner: string }[];  // Explicitly define account type here
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
                data.result.token_accounts.forEach((account: { owner: string }) => {  // Explicit type here
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
function loadPreviousTokenStats(): number {
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
function saveCurrentTokenStats(currentCount: number): void {
    try {
        // Read the existing data
        let existingData: TokenHoldersData = { holders: [] };
        if (fs.existsSync(DATA_FILE)) {
            const rawData = fs.readFileSync(DATA_FILE, "utf8");
            existingData = JSON.parse(rawData);
        }

        // Determine the next ID
        const lastId = existingData.holders.length > 0 ? existingData.holders[existingData.holders.length - 1].id : 0;
        const newId = lastId + 1;

        const newRecord: TokenHolderRecord = {
            id: newId, // Incremented ID
            timestamp: new Date().toISOString(), // ISO string for timestamp
            count: currentCount,
        };

        // Append the new record to the holders array
        existingData.holders.push(newRecord);

        // Ensure the directory exists
        const directory = path.dirname(DATA_FILE);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Write the updated data back to the file
        fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2), "utf8");
    } catch (error) {
        console.error("Error saving token stats:", error);
    }
}

// Get token stats and return an array [message, currentCount]
export async function getTokenStats(): Promise<[string, number]> {
    const previousCount = loadPreviousTokenStats();
    const currentCount = await getTokenHolders();

    const increase = currentCount - previousCount;
    let percentChange: number | string = "N/A";

    // Only calculate and show percentage if increase is positive and previousCount > 0
    if (increase > 0 && previousCount > 0) {
        percentChange = ((increase / previousCount) * 100).toFixed(2); // Calculate percentage change
    }

    saveCurrentTokenStats(currentCount);

    const formattedCount = currentCount.toLocaleString();

    let message = `💊 $ARC Holders  >>  ${formattedCount}`;

    // Show the percentage only if it's positive
    if (percentChange !== "N/A") {
        message += ` (+${percentChange}%)`;
    }

    return [message, currentCount];
}
