import fs from "fs";
import path from "path";

const MILESTONE_FILE = path.join(__dirname, "../public/data/milestones.json");

// Define milestone thresholds for each metric
export const MILESTONES = {
    telegram: [10000, 12500, 15000, 17500, 20000, 25000, 30000, 50000, 75000, 100000, 125000, 150000, 175000, 200000, 225000, 250000],
    githubStars: [100, 500, 1000, 2500, 3500, 4000, 4500, 5000, 7500, 10000, 12500, 15000, 17500, 20000, 25000, 30000, 35000, 40000, 50000, 60000, 70000, 80000, 90000, 100000],
    githubForks: [50, 75, 100, 125, 150, 175, 200, 300, 400, 500, 1000, 2500, 5000, 7500, 10000, 12500, 15000, 17500, 20000, 25000, 30000, 35000, 40000, 50000, 60000, 70000, 80000, 90000, 100000],
    tokenHolders: [50000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000,100000, 125000, 150000, 175000, 200000, 225000, 250000, 275000, 300000],
    xFollowers: [50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000, 125000, 150000, 175000, 200000, 225000, 250000, 275000, 300000]
};

// Load previous milestones from storage
export function loadMilestones(): Record<string, number[]> {
    try {
        if (fs.existsSync(MILESTONE_FILE)) {
            return JSON.parse(fs.readFileSync(MILESTONE_FILE, "utf8"));
        }
    } catch (error) {
        console.error("Error reading milestones file:", error);
    }
    return {};
}

// Save updated milestones to storage
export function saveMilestones(milestones: Record<string, number[]>) {
    try {
        fs.writeFileSync(MILESTONE_FILE, JSON.stringify(milestones, null, 2), "utf8");
    } catch (error) {
        console.error("Error writing milestones file:", error);
    }
}

// Check and determine if milestones have been reached, but don't send messages here
export function checkMilestones(
    metric: string,
    currentValue: number,
    milestoneList: number[]
): number[] {
    const reachedMilestones = loadMilestones(); // Load previously hit milestones

    if (!reachedMilestones[metric]) {
        reachedMilestones[metric] = [];
    }

    const newMilestones = [];
    for (const milestone of milestoneList) {
        if (currentValue >= milestone && !reachedMilestones[metric].includes(milestone)) {
            newMilestones.push(milestone);
            // Mark this milestone as reached
            reachedMilestones[metric].push(milestone);
        }
    }

    // Save the updated milestones
    saveMilestones(reachedMilestones);

    return newMilestones; // Return the list of milestones that were reached
}