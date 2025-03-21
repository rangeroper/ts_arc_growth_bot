import { exec } from 'child_process';
import { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // Run the cron job task (ts-node bot.ts)
    exec('npx ts-node api/bot.ts', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing the cron job: ${error}`);
        return res.statusCode = 500;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      res.statusCode = 200;
      res.end('Cron job executed successfully');
    });
  } catch (err) {
    console.error(`Unexpected error: ${err}`);
    res.statusCode = 500;
    res.end('Unexpected error occurred');
  }
}
