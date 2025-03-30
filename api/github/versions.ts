import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { parse } from 'json2csv';

dotenv.config();

const GITHUB_REPO = process.env.REPO as string;
const VERSION_DATA_FILE = path.join(__dirname, "../../public/data/github_release_version.json");

// Define types for the release version data
interface ReleaseVersionRecord {
    id: number;
    timestamp: string;
    count: string; // Version string (e.g., 'rig-core-v0.10.0')
}

interface ReleaseVersionDataFile {
    versions: ReleaseVersionRecord[];
}

// Fetch the latest release version from GitHub
export async function getReleaseVersion(): Promise<[string, { current: string }]> {
    const previousVersion = loadReleaseVersionData(); // Loading previous version from the file

    try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/releases`;
        const { data } = await axios.get(url);

        // Filter releases to find the latest "rig-core" version
        const rigCoreReleases = data.filter((release: any) => release.tag_name && release.tag_name.startsWith("rig-core"));
        const latestRelease = rigCoreReleases[0]?.tag_name ?? "N/A";

        const currentVersion = {
            current: latestRelease,
            timestamp: new Date().toISOString(),
        };

        // Save the new version data to the file
        saveReleaseVersionData(currentVersion);

        // Construct the message showing previous and current release version
        const previousVersionText = previousVersion ? previousVersion.count : "N/A";
        const message = `🔖 Rig-Core:  ${previousVersionText}  >>  ${latestRelease}`;

        return [message, { current: latestRelease }];
    } catch (error) {
        console.error("Error fetching Release Version data:", error);
        return ["Error fetching Release Version data", { current: "N/A" }];
    }
}

// Load the previous Release Version data from the file
function loadReleaseVersionData(): ReleaseVersionRecord | null {
    try {
        if (fs.existsSync(VERSION_DATA_FILE)) {
            const fileData = fs.readFileSync(VERSION_DATA_FILE, "utf8");
            const parsedData: ReleaseVersionDataFile = JSON.parse(fileData);

            return parsedData.versions?.[parsedData.versions.length - 1] || null;
        }
    } catch (error) {
        console.error(`Error loading data from ${VERSION_DATA_FILE}:`, error);
    }
    return null;
}

// Save the Release Version data to a file
function saveReleaseVersionData(versionData: { current: string; timestamp: string }): void {
    try {
        // Ensure the directory exists
        const directory = path.dirname(VERSION_DATA_FILE);
        fs.mkdirSync(directory, { recursive: true });

        // Initialize data file structure or load existing data
        let versionDataFile: ReleaseVersionDataFile;
        
        if (fs.existsSync(VERSION_DATA_FILE)) {
            const fileData = fs.readFileSync(VERSION_DATA_FILE, "utf8");
            versionDataFile = JSON.parse(fileData);
        } else {
            versionDataFile = { versions: [] };
        }

        // Create a new record for the new version
        const nextVersionId = versionDataFile.versions.length > 0
            ? versionDataFile.versions[versionDataFile.versions.length - 1].id + 1
            : 1;

        const newVersionRecord: ReleaseVersionRecord = {
            id: nextVersionId,
            timestamp: versionData.timestamp,
            count: versionData.current, // The version string (e.g., 'rig-core-v0.10.0')
        };

        // Append the new version record to the versions array
        versionDataFile.versions.push(newVersionRecord);

        // Save data as JSON
        fs.writeFileSync(VERSION_DATA_FILE, JSON.stringify(versionDataFile, null, 2), "utf8");

        // Save data as CSV
        const csvDirectory = path.join(directory, 'csv');
        if (!fs.existsSync(csvDirectory)) {
            fs.mkdirSync(csvDirectory, { recursive: true });
        }

        const csvFileName = path.join(csvDirectory, path.basename(VERSION_DATA_FILE, '.json') + '.csv');
        const csvData = parse(versionDataFile.versions);
        fs.writeFileSync(csvFileName, csvData);

    } catch (error) {
        console.error("Error saving Release Version data:", error);
    }
}