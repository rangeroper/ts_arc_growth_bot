---
title: Github Stars
queries:
    - stars: stars.sql
---

## Stars

<DataTable 
    data={stars} 
/>

# Stars Over Time

The chart below shows how the number of stars changes over time.

<LineChart
    data={stars}
    x="timestamp"
    y="count"
/>


