import { Worker, Job } from "bullmq";
import { redisClient } from "../config/redis.config.js";
import { transporter } from "../config/email.config.js";
import { config } from "../envConfig.js";
import { logger } from "../logger/winston.logger.js";

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

export const emailWorker = new Worker<EmailJobData>(
  "email-processing-queue",
  async (job: Job<EmailJobData>) => {
    logger.info(`Processing email job [ID: ${job.id}] for: ${job.data.to}`);

    await transporter.sendMail({
      from: `"Niyukti.io Support" <${config.smtp.user}>`,
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
    });

    logger.info(`Email successfully dispatched for job [ID: ${job.id}]`);
  },
  {
    connection: redisClient.duplicate(),
    concurrency: 5,
    drainDelay: 300,
  },
);

emailWorker.on("failed", (job, err) => {
  logger.error(`Queue Job Failed [ID: ${job?.id}]:`, { error: err.message });
});