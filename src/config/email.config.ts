import nodemailer from "nodemailer";
import { config } from "../envConfig.js";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});