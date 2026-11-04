import cron from "node-cron";
import { Role } from "../../../generated/prisma/enums";
import logger from "../logger";
import { prisma } from "./prisma";

const deleteUnverifiedUserBatch = async (): Promise<number> => {
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

	const deleted = await prisma.user.deleteMany({
		where: {
			role: Role.USER,
			emailVerified: false,
			isDeleted: false,
			createdAt: { lt: oneHourAgo },
			reportedIncidents: { none: {} },
			incidentChanges: { none: {} },
		},
	});

	return deleted.count;
};

export const deleteUnverifiedUsers = () => {
	cron.schedule("*/10 * * * *", async () => {
		try {
			const count = await deleteUnverifiedUserBatch();

			if (count > 0) {
				logger.info(
					`Deleted ${count} unverified user(s) who registered more than an hour ago.`,
				);
			}
		} catch (error) {
			logger.error("Failed to delete unverified users:", error);
		}
	});

	logger.info("Unverified-user cleanup scheduled every 10 minutes.");
};
