import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";
import config from "../config";

const adapter = new PrismaPg({
	connectionString: config.database_url,
	max: 10,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 15_000,
});

export const prisma = new PrismaClient({
	adapter,
	transactionOptions: { maxWait: 15_000, timeout: 20_000 },
});
