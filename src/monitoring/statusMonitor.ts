import statusMonitor from "express-status-monitor";

export const monitorConfig = statusMonitor({
  title: "Niyukti.io Server Status", 
  path: "/status", // The URL path to access the dashboard
  spans: [
    { interval: 1, retention: 60 }, // Keep 60 datapoints for 1-second intervals
    { interval: 5, retention: 60 }, // Keep 60 datapoints for 5-second intervals
  ],
  chartVisibility: {
    cpu: true,
    mem: true,
    load: true,
    responseTime: true,
    rps: true,
    statusCodes: true,
    
  },
});