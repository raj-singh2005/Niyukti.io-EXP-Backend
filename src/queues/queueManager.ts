import { Queue, QueueOptions } from "bullmq";
import { redisClient } from "../config/redis.config.js";
import { logger } from "../logger/winston.logger.js";

const defaultQueueOptions: QueueOptions = {
  // Pass a duplicate of the Upstash connection to BullMQ
  connection: redisClient.duplicate(), 
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

export class QueueManager {
  private static queues: Map<string, Queue> = new Map();

  public static getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, defaultQueueOptions);
      
      queue.on("error", (err) => {
        logger.error(`BullMQ Queue Error [${name}]:`, { error: err.message });
      });

      this.queues.set(name, queue);
      logger.info(`Initialized background queue: [${name}]`);
    }
    return this.queues.get(name)!;
  }
}