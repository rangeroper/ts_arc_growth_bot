import { VercelRequest, VercelResponse } from '@vercel/node';
import { exec } from 'child_process';
import * as path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Log when the cron job is triggered
        const currentTime = new Date().toISOString();
        console.log(`Cron job triggered at ${currentTime}`);

        // Adjust path to bot.ts from cron folder
        const scriptPath = path.resolve(__dirname, '../../bot.ts'); // Move up two directories to reach bot.ts
        exec(`npx ts-node ${scriptPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing bot.ts: ${error}`);
                res.status(500).json({ success: false, message: 'Error executing bot.ts' });
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
            console.log(`stdout: ${stdout}`);

            res.status(200).json({ success: true, message: 'Cron job executed successfully' });
        });
    } catch (error) {
        console.error('Error executing cron job:', error);
        res.status(500).json({ success: false, message: 'Error executing cron job' });
    }
}
