import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const GITHUB_REPO = process.env.REPO as string;
const STARS_DATA_FILE = path.join(__dirname, "../public/data/github_stars.json");
const FORKS_DATA_FILE = path.join(__dirname, "../public/data/github_forks.json");
const VERSION_DATA_FILE = path.join(__dirname, "../public/data/github_release_version.json");

interface GitHubStats {
    stars: {
        current: number;
        timestamp: string;
    };
    forks: {
        current: number;
        timestamp: string;
    };
    release_version: {
        current: string;
        timestamp: string;
    };
}

interface GitHubStatChanges {
    current: number | string;
    increase: number | string;
    percent_change: number | string;
}

// Fetch GitHub Stats
export async function getGithubStats(): Promise<[string, GitHubStats, boolean]> {
    const previousStats = loadPreviousGitHubStats();

    try {
        const repoUrl = `https://api.github.com/repos/${GITHUB_REPO}`;
        const { data } = await axios.get(repoUrl);

        const stars = data.stargazers_count ?? 0;
        const forks = data.forks_count ?? 0;
        const releaseVersion = await getCurrentReleaseVersion();

        const currentStats: GitHubStats = {
            stars: {
                current: stars,
                timestamp: new Date().toISOString()
            },
            forks: {
                current: forks,
                timestamp: new Date().toISOString()
            },
            release_version: {
                current: releaseVersion,
                timestamp: new Date().toISOString()
            }
        };

        const stats: Record<string, GitHubStatChanges> = {};

        for (const key of Object.keys(currentStats) as (keyof GitHubStats)[]) {
            const currentValue = key === "release_version" ? currentStats[key].current : Number(currentStats[key].current);
            const previousValue = key === "release_version" ? previousStats[key].current ?? "N/A" : Number(previousStats[key].current ?? 0);

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

        console.log("Previous Release Version:", previousStats.release_version.current);
        console.log("Current Release Version:", currentStats.release_version.current);
        
        const isNewRelease = currentStats.release_version.current !== previousStats.release_version.current;
        
        console.log("Is New Release?", isNewRelease);
        

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

        return [message, currentStats, isNewRelease]; // Return the flag for new release
    } catch (error) {
        console.error("Error fetching GitHub stats:", error);
        const message = "❌ Error fetching GitHub stats.";
        return [message, previousStats, false]; // Return `false` for isNewRelease on error
    }
}

// Fetch the latest release version
async function getCurrentReleaseVersion(): Promise<string> {
    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/releases`;
        const { data } = await axios.get(url);

        // Filter releases to only include rig-core versions
        const rigCoreReleases = data.filter((release: any) => release.tag_name && release.tag_name.startsWith("rig-core"));

        if (rigCoreReleases.length === 0) {
            return "N/A"; // No rig-core releases found
        }

        // Get the latest release (highest version)
        const latestRelease = rigCoreReleases.reduce((latest: any, release: any) => {
            const latestVersion = latest.tag_name.replace('rig-core-', '').split('.').map(Number);
            const releaseVersion = release.tag_name.replace('rig-core-', '').split('.').map(Number);

            // Compare versions
            for (let i = 0; i < Math.max(latestVersion.length, releaseVersion.length); i++) {
                const lv = latestVersion[i] || 0;
                const rv = releaseVersion[i] || 0;

                if (lv > rv) return latest;
                if (lv < rv) return release;
            }
            return latest; // If versions are the same, return the first
        });

        return latestRelease.tag_name ?? "N/A";

    } catch (error) {
        return "N/A";
    }
}

// Load previous GitHub stats from file
function loadPreviousGitHubStats(): GitHubStats {
    try {
        const stars = loadMetricData(STARS_DATA_FILE);
        const forks = loadMetricData(FORKS_DATA_FILE);
        const releaseVersion = loadMetricData(VERSION_DATA_FILE);

        console.log("Loaded previous stats:");
        console.log("Stars:", stars);
        console.log("Forks:", forks);
        console.log("Release Version:", releaseVersion);

        return {
            stars: stars ?? { current: 0, timestamp: "N/A" },
            forks: forks ?? { current: 0, timestamp: "N/A" },
            release_version: releaseVersion?.versions?.length > 0 
                ? { current: releaseVersion.versions[releaseVersion.versions.length - 1].count, timestamp: releaseVersion.versions[releaseVersion.versions.length - 1].timestamp }
                : { current: "N/A", timestamp: "N/A" }
        };
    } catch (error) {
        console.error("Error loading previous GitHub stats:", error);
    }

    return {
        stars: { current: 0, timestamp: "N/A" },
        forks: { current: 0, timestamp: "N/A" },
        release_version: { current: "N/A", timestamp: "N/A" }
    }; // Default stats if no file found or error occurred
}

// Load individual metric data from file
function loadMetricData(filePath: string): any {
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            return data;
        }
    } catch (error) {
        console.error(`Error loading data from ${filePath}:`, error);
    }
    return null;
}

// Save the GitHub stats to separate files
function saveCurrentGitHubStats(stats: GitHubStats): void {
    try {
        fs.mkdirSync(path.dirname(STARS_DATA_FILE), { recursive: true });

        // Load existing data or initialize empty structures
        const starsData = fs.existsSync(STARS_DATA_FILE) ? JSON.parse(fs.readFileSync(STARS_DATA_FILE, "utf8")) : { stars: [] };
        const forksData = fs.existsSync(FORKS_DATA_FILE) ? JSON.parse(fs.readFileSync(FORKS_DATA_FILE, "utf8")) : { forks: [] };
        const versionData = fs.existsSync(VERSION_DATA_FILE) ? JSON.parse(fs.readFileSync(VERSION_DATA_FILE, "utf8")) : { versions: [] };

        // Determine the next ID for each metric
        const nextStarId = starsData.stars.length > 0 ? starsData.stars[starsData.stars.length - 1].id + 1 : 1;
        const nextForkId = forksData.forks.length > 0 ? forksData.forks[forksData.forks.length - 1].id + 1 : 1;
        const nextVersionId = versionData.versions.length > 0 ? versionData.versions[versionData.versions.length - 1].id + 1 : 1;

        // Prepare new records with incremented IDs
        const newStarRecord = {
            id: nextStarId,
            timestamp: stats.stars.timestamp,
            count: stats.stars.current
        };

        const newForkRecord = {
            id: nextForkId,
            timestamp: stats.forks.timestamp,
            count: stats.forks.current
        };

        const newVersionRecord = {
            id: nextVersionId,
            timestamp: stats.release_version.timestamp,
            count: stats.release_version.current
        };

        // Append new records to the existing data
        starsData.stars.push(newStarRecord);
        forksData.forks.push(newForkRecord);
        versionData.versions.push(newVersionRecord);

        // Save updated data back to the files
        fs.writeFileSync(STARS_DATA_FILE, JSON.stringify(starsData, null, 2), "utf8");
        fs.writeFileSync(FORKS_DATA_FILE, JSON.stringify(forksData, null, 2), "utf8");
        fs.writeFileSync(VERSION_DATA_FILE, JSON.stringify(versionData, null, 2), "utf8");

    } catch (error) {
        console.error("Error saving GitHub stats:", error);
    }
}
