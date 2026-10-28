import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { emailQueue } from "../queues/email.queue.js";
import { logger } from "../logger/winston.logger.js";
import { ApiError } from "../utils/apiError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailService {
  private static async queueOtpEmail(
    to: string,
    name: string,
    otp: string,
    subject: string,
  ): Promise<void> {
    try {
      const templatePath = path.join(__dirname, "../templates/emails/otp.ejs");
      const htmlContent = await ejs.renderFile(templatePath, { name, otp });

      await emailQueue.add("send-otp", {
        to,
        subject,
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

  public static async sendOtpEmail(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    return this.queueOtpEmail(
      to,
      name,
      otp,
      "Your Niyukti.io Verification Code",
    );
  }

  public static async sendPasswordResetOtpEmail(
    to: string,
    name: string,
    otp: string,
  ): Promise<void> {
    return this.queueOtpEmail(
      to,
      name,
      otp,
      "Your Niyukti.io Password Reset Code",
    );
  }
}