import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { config } from "./envConfig.js";

// We use the pooled connection for high performance in the app
const adapter = new PrismaNeon({
  connectionString: config.databaseUrl
});

export const prisma = new PrismaClient({ adapter });