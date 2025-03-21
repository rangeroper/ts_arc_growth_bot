import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as string;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY as string;
const DATA_FILE = path.join(__dirname, "../data/token_holders.json");

interface HeliusResponse {
    result?: {
        token_accounts?: { owner: string }[]; 
        cursor?: string;
    };
    error?: { message: string };
}

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
                data.result.token_accounts.forEach(account => {
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

function loadPreviousTokenStats(): number {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
            return data.holders?.current || 0;
        }
    } catch (error) {
        console.error("Error loading previous token stats:", error);
    }
    return 0;
}

function saveCurrentTokenStats(currentCount: number): void {
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        const stats = { holders: { current: currentCount } };
        fs.writeFileSync(DATA_FILE, JSON.stringify(stats, null, 2), "utf8");
    } catch (error) {
        console.error("Error saving token stats:", error);
    }
}

export async function getTokenStats(): Promise<string> {
    const previousCount = loadPreviousTokenStats();
    const currentCount = await getTokenHolders();

    // Log both previous and current counts for better tracking
    console.log(`Previous Count: ${previousCount}`);
    console.log(`Current Count: ${currentCount}`);

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

    console.log("Formatted Token Holders Stats:", message); // Log the final message for debugging

    return message;
}

