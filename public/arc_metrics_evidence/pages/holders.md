---
title: Arc Holders
queries:
    - holders: holders.sql
---

# Holders

<DataTable 
    data={holders} 
/>

# Holders Over Time

The chart below shows how the number of Arc holder changes over time.

<LineChart
    data={holders}
    x="timestamp"
    y="count"
/>


