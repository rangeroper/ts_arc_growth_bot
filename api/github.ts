import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const GITHUB_REPO = process.env.GITHUB_REPO as string;
const DATA_FILE = path.join(__dirname, "../data/github_metrics.json");

interface GitHubStats {
    stars: number;
    forks: number;
    release_version: string;
}

interface GitHubStatChanges {
    current: number | string;
    increase: number | string;
    percent_change: number | string;
}

export async function getGithubStats(): Promise<[string, GitHubStats, boolean]> {
    const previousStats = loadPreviousGitHubStats();

    try {
        const repoUrl = `https://api.github.com/repos/${GITHUB_REPO}`;
        const { data } = await axios.get(repoUrl);

        const stars = data.stargazers_count ?? 0;
        const forks = data.forks_count ?? 0;
        const releaseVersion = await getCurrentReleaseVersion();
        const currentStats: GitHubStats = { stars, forks, release_version: releaseVersion };
        const stats: Record<string, GitHubStatChanges> = {};

        for (const key of Object.keys(currentStats) as (keyof GitHubStats)[]) {
            const currentValue = key === "release_version" ? currentStats[key] : Number(currentStats[key]);
            const previousValue = key === "release_version" ? previousStats[key] ?? "N/A" : Number(previousStats[key] ?? 0);

            let increase: number | string = "N/A";
            let percentChange: number | string = "N/A";

            if (key !== "release_version") {
                const prevNum = typeof previousValue === "number" ? previousValue : 0;
                const currNum = typeof currentValue === "number" ? currentValue : 0;
                increase = currNum - prevNum;

                // Prevent division by zero (handle Infinity issue)
                if (prevNum === 0) {
                    percentChange = "N/A"; // No percentage change for zero previous count
                } else {
                    // Calculate percentage only for positive increases
                    if (increase === 0) {
                        percentChange = "N/A"; // No percentage for no change
                    } else if (increase < 0) {
                        percentChange = "N/A"; // No percentage for decrease
                    } else {
                        percentChange = ((increase / prevNum) * 100).toFixed(2);
                        console.log(`Percentage Change for ${key}: ${percentChange}%`); // Log the percentage change
                    }
                }
            }

            stats[key] = {
                current: currentValue,
                increase,
                percent_change: percentChange
            };
        }

        saveCurrentGitHubStats(currentStats); 

        // Check for a new release version
        const isNewRelease = currentStats.release_version !== previousStats.release_version;


        // Format GitHub Stats Message
        const formattedStars = stats["stars"].current.toLocaleString();
        const formattedForks = stats["forks"].current.toLocaleString();

        let message = `⭐️ Github Stars  >>  ${formattedStars}`;
        // Only show percentage if it's a positive change
        if (stats["stars"].percent_change !== "N/A" && typeof stats["stars"].increase === "number" && stats["stars"].increase > 0) {
            message += ` (+${stats["stars"].percent_change}%)`; // Only show percentage if there is a positive increase
        }

        message += `\n🍴 Github Forks  >>  ${formattedForks}`;
        // Only show percentage if it's a positive change
        if (stats["forks"].percent_change !== "N/A" && typeof stats["forks"].increase === "number" && stats["forks"].increase > 0) {
            message += ` (+${stats["forks"].percent_change}%)`; // Only show percentage if there is a positive increase
        }

        message += `\n🔖 Rig Version  >>  ${stats["release_version"].current !== "N/A" ? stats["release_version"].current : "N/A"}`;

        // Return the new release message only if it's a new release
        const releaseMessage = isNewRelease ? `\n\n🚀 New Rig Release: Version **${currentStats.release_version}** is live!` : "";

        message += releaseMessage;

        return [message, currentStats, isNewRelease]; // Return the flag for new release
    } catch (error) {
        console.error("Error fetching GitHub stats:", error);
        const message = "❌ Error fetching GitHub stats.";
        return [message, previousStats, false]; // Return `false` for isNewRelease on error
    }
}

async function getCurrentReleaseVersion(): Promise<string> {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
        const { data } = await axios.get(url);
        return data.tag_name ?? "N/A";
    } catch (error) {
        return "N/A";
    }
}

function loadPreviousGitHubStats(): GitHubStats {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
            return data;
        }
    } catch (error) {
        console.error("Error loading previous GitHub stats:", error);
    }
    return { stars: 0, forks: 0, release_version: "N/A" }; // Default stats if no file found or error occurred
}

function saveCurrentGitHubStats(stats: GitHubStats): void {
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(stats, null, 2), "utf8");
    } catch (error) {
        console.error("Error saving GitHub stats:", error);
    }
}
