import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { parse } from 'json2csv';

const X_METRICS_FILE = path.join(__dirname, "../public/data/x_metrics.json");

// Function to scrape X profile for follower data
async function scrapeXProfile(url: string): Promise<any | null> {
    const xhrCalls: any[] = [];

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    });
    const page = await context.newPage();

    page.on("response", (response) => {
        if (response.request().resourceType() === "xhr") xhrCalls.push(response);
    });

    await page.goto(url);
    await page.waitForSelector('[data-testid="primaryColumn"]');
    await page.waitForTimeout(3000);

    const tweetCalls = xhrCalls.filter((f: any) => f.url().includes("UserBy"));
    for (const xhr of tweetCalls) {
        const data = await xhr.json();
        await browser.close();
        return data.data.user.result;
    }

    await browser.close();
    return null;
}

// Function to calculate percentage change
function calculatePercentageChange(previous: number, current: number): string {
    if (previous <= 0 || current <= previous) return "0%"; // No change or 0%
    const change = ((current - previous) / previous) * 100;

    // Check if the change is too small to display in 2 decimal places
    if (Math.abs(change) < 0.01) {
        return `< 0.01%`; // Display as "< 0.01%" for very small changes
    } else {
        return `${change.toFixed(2)}%`; // Display with 2 decimal places
    }
}

// Function to load previous follower records from file
function loadPreviousFollowers(): any[] {
    try {
        if (fs.existsSync(X_METRICS_FILE)) {
            return JSON.parse(fs.readFileSync(X_METRICS_FILE, "utf8")).followers ?? [];
        }
    } catch (error) {
        console.error("Error loading previous followers:", error);
    }
    return [];
}

// Function to save the follower count with a new entry
function saveFollowersCount(count: number): void {
    try {
        const previousData = loadPreviousFollowers();
        const id = previousData.length > 0 ? previousData[previousData.length - 1].id + 1 : 1;
        const timestamp = new Date().toISOString();

        previousData.push({ id, timestamp, count });


        const directory = path.dirname(X_METRICS_FILE);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(path.dirname(X_METRICS_FILE), { recursive: true });
        }

        // Save data as JSON
        fs.writeFileSync(X_METRICS_FILE, JSON.stringify({ followers: previousData }, null, 2));

        // Save data as CSV
        const csvDirectory = path.join(directory, 'csv');
        if (!fs.existsSync(csvDirectory)) {
            fs.mkdirSync(csvDirectory, { recursive: true });
        }

        const csvFileName = path.join(csvDirectory, path.basename(X_METRICS_FILE, '.json') + '.csv');
        const csvData = parse(previousData);  // Convert the data to CSV format
        fs.writeFileSync(csvFileName, csvData);
    } catch (error) {
        console.error("Error saving followers count:", error);
    }
}

// Function to fetch current follower stats
export async function getXFollowersStats(): Promise<[string, number]> {
    const previousData = loadPreviousFollowers();
    const profile = await scrapeXProfile("https://x.com/arcdotfun");
    const currentCount = profile?.legacy?.followers_count ?? 0;
    const previousCount = previousData.length > 0 ? previousData[previousData.length - 1].count : 0;

    // Calculate percentage change
    const percentChange = calculatePercentageChange(previousCount, currentCount);

    // Save the new count
    saveFollowersCount(currentCount);

    // Format message
    let message = `🐦 X Followers:  ${previousCount.toLocaleString()}  >>  ${currentCount.toLocaleString()} (${percentChange})`;

    return [message, currentCount];
}

// Function to execute and return the formatted followers message
async function fetchXFollowers(): Promise<[string, number]> {
    return await getXFollowersStats();
}

// Execute the script and log the output
fetchXFollowers().catch((error) => console.error("Error fetching followers:", error));
