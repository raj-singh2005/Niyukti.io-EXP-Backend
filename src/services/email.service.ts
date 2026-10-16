import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { emailQueue } from "../queues/email.queue.js";
import { logger } from "../logger/winston.logger.js";
import { ApiError } from "../utils/apiError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailService {
  public static async sendOtpEmail(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    try {
      const templatePath = path.join(__dirname, "../templates/emails/otp.ejs");
      
      const htmlContent = await ejs.renderFile(templatePath, { name, otp });

      await emailQueue.add("send-otp", {
        to,
        subject: "Your Niyukti.io Verification Code",
        html: htmlContent,
      });

      logger.info(`OTP Email job queued for: ${to}`);
    } catch (error) {
      logger.error("Failed to queue OTP email job:", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw ApiError.internal("Failed to process email request");
    }
  }
}