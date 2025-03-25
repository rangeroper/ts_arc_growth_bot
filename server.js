const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// API endpoint to return token holders data
app.get('/api/token-holders', (req, res) => {
  // Define the file path to token_holders.json
  const filePath = path.join(__dirname, 'data', 'token_holders.json');

  // Read the file asynchronously
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      // If there's an error (e.g., file not found), send a 500 error
      return res.status(500).json({ error: 'Failed to read token_holders.json' });
    }

    try {
      // Parse the JSON data from the file
      const tokenData = JSON.parse(data);

      // Send the data as a response
      res.json(tokenData);
    } catch (err) {
      // If there's an error parsing the JSON, send a 500 error
      res.status(500).json({ error: 'Failed to parse token_holders.json' });
    }
  });
});

// Start the server on port 3000
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
