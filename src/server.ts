import { seedDatabase } from "../prisma/seed/seed";
import app from "./app";
import config from "./app/config";
import { deleteUnverifiedUsers, purgeDeletedAccounts } from "./app/lib/cron";
import { transporter } from "./app/lib/nodemailer";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";
import logger from "./app/logger";

const PORT = Number(config.port);

const main = async () => {
	try {
		await prisma.$connect();
		logger.info("Connected to the database successfully.");

		await redisClient.connect();
		logger.info("Redis Connected Successfully.");

		await transporter.verify();
		logger.info("Nodemailer Connected Successfully.");

		await seedDatabase();

		await deleteUnverifiedUsers();
		await purgeDeletedAccounts();

		const server = app.listen(PORT, () => {
			logger.info(`Server is running on port ${PORT}`);
		});

		let shuttingDown = false;

		const shutdown = (signal: string) => {
			if (shuttingDown) return;
			shuttingDown = true;

			logger.info(`${signal} received. Shutting down gracefully...`);

			const force = setTimeout(() => {
				logger.error("Forced shutdown after timeout.");
				process.exit(1);
			}, 10_000);
			force.unref();

			server.close(async (error) => {
				try {
					await prisma.$disconnect();
					await redisClient.disconnect();

					if (error) {
						logger.error("Error while closing the HTTP server:", error);
						process.exit(1);
					}

					logger.info("Database and Redis disconnected. Exiting.");
					process.exit(0);
				} catch (shutdownError) {
					logger.error("Error during graceful shutdown:", shutdownError);
					process.exit(1);
				}
			});
		};

		process.on("SIGINT", () => shutdown("SIGINT"));
		process.on("SIGTERM", () => shutdown("SIGTERM"));

		process.on("unhandledRejection", (reason) => {
			logger.error("Unhandled Rejection:", reason);
		});

		process.on("uncaughtException", (error) => {
			logger.error("Uncaught Exception:", error);
			process.exit(1);
		});
	} catch (error) {
		logger.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();
