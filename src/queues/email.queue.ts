import { QueueManager } from "./queueManager.js";

// Initialize the email queue using the centralized manager
export const emailQueue = QueueManager.getQueue("email-processing-queue");