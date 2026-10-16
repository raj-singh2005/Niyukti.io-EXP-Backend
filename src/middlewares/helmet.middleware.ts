import helmet from "helmet";
import { RequestHandler } from "express";

export const helmetMiddleware: RequestHandler = helmet({
  // Allow cross-origin requests if your Next.js frontend is on a different port/domain
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  
  // Future-proofing: You can easily add your custom CSP rules here later 
  // contentSecurityPolicy: { ... }
});