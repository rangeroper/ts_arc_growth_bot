import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 4000; // Use dynamic port for Vercel

const dataFolderPath = path.join(__dirname, '..', 'data');

// Helper function to read JSON file and send response
const sendJsonResponse = (res: Response, fileName: string): void => {
    try {
        const filePath = path.join(dataFolderPath, fileName);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            res.json(JSON.parse(data));
        } else {
            res.status(404).json({ error: `Data file ${fileName} not found` });
        }
    } catch (error) {
        console.error("Error fetching data for API:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};

// Define API routes
app.get('/github-metrics/stars', (req: Request, res: Response) => sendJsonResponse(res, 'github_metrics.json'));
app.get('/github-metrics/forks', (req: Request, res: Response) => sendJsonResponse(res, 'github_metrics.json'));
app.get('/github-metrics/release-version', (req: Request, res: Response) => sendJsonResponse(res, 'github_metrics.json'));
app.get('/telegram-metrics', (req: Request, res: Response) => sendJsonResponse(res, 'telegram_metrics.json'));
app.get('/token-holders', (req: Request, res: Response) => sendJsonResponse(res, 'token_holders.json'));
app.get('/x-metrics', (req: Request, res: Response) => sendJsonResponse(res, 'x_metrics.json'));

// Start the Express server
app.listen(PORT, () => {
    console.log(`API Server is running on port ${PORT}`);
});

export default app;
module.exports = app;

