// Import the http module to make HTTP requests
import http from "k6/http"; 
// Import the sleep function to introduce delays in your test script
import { check, sleep } from "k6"; 

export const options = {
  vus: 1500, // Simulates 50 virtual users
  duration: "30s", 
};

// This is where the test logic resides
export default function () {
  // Target your express-status-monitor dashboard
  const res = http.get("http://localhost:5050/");

  // Validate response status
  check(res, {
    "is status 200": (r) => r.status === 200,
  });

  sleep(1);
}