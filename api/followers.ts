import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const X_METRICS_FILE = path.join(__dirname, "../public/data/x_metrics.json");

// Function to scrape X profile for follower data
async function scrapeXProfile(url: string): Promise<any | null> {
    const xhrCalls: any[] = [];

    const interceptResponse = (response: any) => {
        if (response.request().resourceType() === 'xhr') {
            xhrCalls.push(response);
        }
        return response;
    };

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    page.on('response', interceptResponse);
    await page.goto(url);
    await page.waitForSelector('[data-testid="primaryColumn"]');
    await page.waitForTimeout(3000);

    const tweetCalls = xhrCalls.filter((f: any) => f.url().includes('UserBy'));
    for (const xhr of tweetCalls) {
        const data = await xhr.json();
        await browser.close();
        return data.data.user.result;
    }

    await browser.close();
    return null;
}

// Function to load previous follower records from file
function loadPreviousFollowers(): any[] {
    try {
        if (fs.existsSync(X_METRICS_FILE)) {
            const data = JSON.parse(fs.readFileSync(X_METRICS_FILE, 'utf8'));
            return data.followers || []; // Return the followers data array or empty array
        }
    } catch (error) {
        console.error('Error loading previous followers:', error);
    }
    return []; // Return empty array if file doesn't exist or is invalid
}

// Function to save the follower count with a new entry
function saveFollowersCount(count: number): void {
    try {
        const previousData = loadPreviousFollowers();

        // Get the last entry's id or start from 1 if it's empty
        const id = previousData.length > 0 ? previousData[previousData.length - 1].id + 1 : 1;

        // Get the current date and time in ISO format
        const timestamp = new Date().toISOString();

        const newData = {
            id: id,
            timestamp: timestamp,
            count: count
        };

        // Add the new data to the array
        previousData.push(newData);

        // Ensure the directory exists
        fs.mkdirSync(path.dirname(X_METRICS_FILE), { recursive: true });

        // Write the updated data back to the file
        fs.writeFileSync(X_METRICS_FILE, JSON.stringify({ followers: previousData }, null, 2));
    } catch (error) {
        console.error('Error saving followers count:', error);
    }
}

// Function to fetch current follower stats
export async function getXFollowersStats(): Promise<[string, number]> {
    const previousData = loadPreviousFollowers();
    const profile = await scrapeXProfile('https://x.com/arcdotfun');
    let currentCount = 0;

    if (profile && profile.legacy && profile.legacy.followers_count) {
        currentCount = profile.legacy.followers_count;
    }

    // Calculate increase and percentage change
    const previousCount = previousData.length > 0 ? previousData[previousData.length - 1].count : 0;
    const increase = currentCount - previousCount;
    let percentChange = 'N/A';

    // Check if percentage change should be shown (only if the increase is positive)
    if (increase > 0 && previousCount > 0) {
        percentChange = ((increase / previousCount) * 100).toFixed(2); // Calculate percentage change
    } else if (increase === 0) {
        percentChange = '0.00';  // Show 0.00% if there's no change
    }

    // Save the new count with the timestamp
    saveFollowersCount(currentCount);

    // Format count with commas
    const formattedCount = currentCount.toLocaleString();

    // Generate formatted message
    let message = `🐦 X Followers  >>  ${formattedCount}`;

    // Show percentage only if it is positive
    if (percentChange !== 'N/A' && percentChange !== '0.00') {
        message += ` (+${percentChange}%)`; // Only show percentage if it's positive and not 0.00
    }

    return [message, currentCount];
}

// Function to run and return the formatted followers message
async function fetchXFollowers(): Promise<[string, number]> {
    return await getXFollowersStats();
}

// Execute the script and log the output
fetchXFollowers().then(([message, currentCount]) => {
}).catch(error => console.error('Error fetching followers:', error));