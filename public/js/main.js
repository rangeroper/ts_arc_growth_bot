async function loadMetrics(filePath, tableBodyId) {
    try {
        console.log(`Fetching data from: ${filePath}`);
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const tableBody = document.getElementById(tableBodyId);

        // Clear previous table data
        tableBody.innerHTML = "";

        // Extract the first key from the JSON object (e.g., "followers", "forks", etc.)
        const metricKey = Object.keys(data)[0]; 
        if (!metricKey || !Array.isArray(data[metricKey])) {
            throw new Error("Unexpected data structure.");
        }

        // Process each record
        data[metricKey].forEach(record => {
            const row = document.createElement('tr');

            // Extract and format data
            const id = record.id || 'N/A';
            const timestamp = record.timestamp ? new Date(record.timestamp).toLocaleString() : 'N/A';
            const count = record.count !== undefined ? record.count.toLocaleString() : 'N/A';

            // Populate row
            row.innerHTML = `
                <td>${id}</td>
                <td>${timestamp}</td>
                <td>${count}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading data:', error);
        const tableBody = document.getElementById(tableBodyId);
        tableBody.innerHTML = `<tr><td colspan="3">Error loading data: ${error.message}</td></tr>`;
    }
}

// Load different datasets
loadMetrics('data/x_metrics.json', 'xMetricsBody');
loadMetrics('data/telegram_metrics.json', 'telegramMetricsBody');
loadMetrics('data/token_holders.json', 'tokenHoldersBody');
loadMetrics('data/github_stars.json', 'githubStarBody');
loadMetrics('data/github_forks.json', 'githubForkBody');
