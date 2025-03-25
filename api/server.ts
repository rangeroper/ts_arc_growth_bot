import express, { Response, Request } from "express";
import path from "path";
import fs from "fs";

// Initialize the Express app
const app = express();
const PORT = 4000;

// Set up the data path to the 'data' folder one level above the 'api' folder
const dataFolderPath = path.join(__dirname, '..', 'data'); // Going up one directory to 'data'

// Helper function to read JSON file and send response
const sendJsonResponse = (res: Response, fileName: string): void => {
    try {
        const filePath = path.join(dataFolderPath, fileName);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            res.json(JSON.parse(data)); // Send the data as JSON response
        } else {
            res.status(404).json({ error: `Data file ${fileName} not found` }); // Fixed string interpolation
        }
    } catch (error) {
        console.error("Error fetching data for API:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};

// Helper function to send GitHub metric
const sendGithubMetric = (res: Response, metricName: string): void => {
    try {
        const filePath = path.join(dataFolderPath, 'github_metrics.json');
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (data[metricName] !== undefined) {
                res.json({ [metricName]: data[metricName] });
            } else {
                res.status(404).json({ error: `Metric ${metricName} not found` }); // Fixed string interpolation
            }
        } else {
            res.status(404).json({ error: 'github_metrics.json file not found' });
        }
    } catch (error) {
        console.error("Error fetching GitHub metric:", error);
        res.status(500).json({ error: "Failed to fetch GitHub metric" });
    }
};

// Define the routes for each metric file
app.get('/github-metrics/stars', (req: Request, res: Response) => sendGithubMetric(res, 'stars'));
app.get('/github-metrics/forks', (req: Request, res: Response) => sendGithubMetric(res, 'forks'));
app.get('/github-metrics/release-version', (req: Request, res: Response) => sendGithubMetric(res, 'release_version'));

app.get('/telegram-metrics', (req: Request, res: Response) => sendJsonResponse(res, 'telegram_metrics.json'));
app.get('/token-holders', (req: Request, res: Response) => sendJsonResponse(res, 'token_holders.json'));
app.get('/x-metrics', (req: Request, res: Response) => sendJsonResponse(res, 'x_metrics.json'));

// Start the Express server
app.listen(PORT, () => {
    console.log(`API Server is running on port ${PORT}`); // Fixed string interpolation
});
