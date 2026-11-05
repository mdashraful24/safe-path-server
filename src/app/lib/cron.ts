import cron from "node-cron";
import { Role } from "../../../generated/prisma/enums";
import { prisma } from "./prisma";

export const deleteUnverifiedUsers = async () => {
	cron.schedule("*/30 * * * *", async () => {
		try {
			const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

			const deletedUsers = await prisma.user.deleteMany({
				where: {
					role: Role.USER,
					emailVerified: false,
					isDeleted: false,
					createdAt: { lt: oneHourAgo },
					reportedIncidents: { none: {} },
					incidentChanges: { none: {} },
				},
			});

			if (deletedUsers.count > 0) {
				console.log(
					`Cron Job: Deleted ${deletedUsers.count} unverified user(s) who registered more than an hour ago.`,
				);
			}
		} catch (error) {
			console.error("Cron Job: Error while deleting unverified users:", error);
		}

		console.log("User delete cron schedule (every 30 minutes)");
	},
		{ timezone: "Asia/Dhaka" },
	);
};
