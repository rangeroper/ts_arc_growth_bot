---
title: Github Forks
queries:
    - forks: forks.sql
---

## Forks

<DataTable 
    data={forks} 
/>

# Forks Over Time

The chart below shows how the number of forks changes over time.

<LineChart
    data={forks}
    x="timestamp"
    y="count"
/>


