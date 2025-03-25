const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Helper function to read JSON files
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return null; // If there's an error, return null
  }
};

// Load all the data at server startup
const tokenHoldersData = readJsonFile(path.join(__dirname, 'data', 'token_holders.json'));
const xMetricsData = readJsonFile(path.join(__dirname, 'data', 'x_metrics.json'));
const telegramMetricsData = readJsonFile(path.join(__dirname, 'data', 'telegram_metrics.json'));
const githubMetricsData = readJsonFile(path.join(__dirname, 'data', 'github_metrics.json'));

// Individual API endpoints
app.get('/api/token-holders', (req, res) => {
  res.json(tokenHoldersData || { error: 'Data not found' });
});

app.get('/api/x-metrics', (req, res) => {
  res.json(xMetricsData || { error: 'Data not found' });
});

app.get('/api/telegram-metrics', (req, res) => {
  res.json(telegramMetricsData || { error: 'Data not found' });
});

app.get('/api/github-metrics', (req, res) => {
  res.json(githubMetricsData || { error: 'Data not found' });
});

// Combined API endpoint at the root path `/`
app.get('/api/', (req, res) => {
  const combinedData = {
    tokenHolders: tokenHoldersData,
    xMetrics: xMetricsData,
    telegramMetrics: telegramMetricsData,
    githubMetrics: githubMetricsData
  };

  // Return the combined data as a JSON response
  res.json(combinedData);
});

// Start the server on port 3000
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
