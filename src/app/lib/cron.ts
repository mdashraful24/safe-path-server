import { randomUUID } from "node:crypto";
import cron from "node-cron";
import {
	AccountLifecycleEventType,
	AdminChangeRequestStatus,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";
import { getAccountLifecyclePolicy } from "../utils/accountLifecycle";
import { hashPassword } from "../utils/password";
import { deleteCloudinaryImage } from "./cloudinary";
import { prisma } from "./prisma";
import logger from "../logger";

const ANONYMIZED_EMAIL_DOMAIN = "deleted.safepath.local";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getAnonymizedEmail = (userId: string) =>
	`purged+${userId}@${ANONYMIZED_EMAIL_DOMAIN}`;

const getLegacyPurgeCutoff = () => {
	const { retentionDays } = getAccountLifecyclePolicy();

	return new Date(Date.now() - retentionDays * DAY_IN_MS);
};

export const deleteUnverifiedUsers = async () => {
	cron.schedule(
		"*/30 * * * *",
		async () => {
			try {
				const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

				const deletedUsers = await prisma.user.deleteMany({
					where: {
						role: Role.USER,
						emailVerified: false,
						isDeleted: false,
						status: {
							in: [
								UserStatus.ACTIVE,
								UserStatus.BLOCKED,
								UserStatus.PENDING_DELETION,
							],
						},
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
				logger.error(
					"Cron Job: Error while deleting unverified users:",
					error,
				);
			}

			logger.info("User delete cron schedule (every 30 minutes)");
		},
		{ timezone: "Asia/Dhaka" },
	);
};

export const purgeExpiredAccounts = async () => {
	const { purgeBatchSize } = getAccountLifecyclePolicy();
	const now = new Date();
	const legacyCutoff = getLegacyPurgeCutoff();
	let totalPurged = 0;

	try {
		while (true) {
			const users = await prisma.user.findMany({
				where: {
					status: UserStatus.DELETED,
					OR: [
						{ purgeAfter: { lte: now } },
						{
							purgeAfter: null,
							deletedAt: { lte: legacyCutoff },
						},
					],
				},
				select: {
					id: true,
					imagePublicId: true,
				},
				orderBy: [{ purgeAfter: "asc" }, { id: "asc" }],
				take: purgeBatchSize,
			});

			if (users.length === 0) {
				break;
			}

			let successfulPurges = 0;
			let hadFailure = false;

			for (const user of users) {
				try {
					const passwordHash = await hashPassword(randomUUID());
					const purgedAt = new Date();

					const purged = await prisma.$transaction(async (tx) => {
						const updated = await tx.user.updateMany({
							where: {
								id: user.id,
								status: UserStatus.DELETED,
							},
							data: {
								name: "Deleted User",
								email: getAnonymizedEmail(user.id),
								passwordHash,
								emailVerified: false,
								emailVerifiedAt: null,
								imageUrl: null,
								imagePublicId: null,
								status: UserStatus.PURGED,
								isDeleted: true,
								purgedAt,
								deletionRequestedAt: null,
								deletionRequestReason: null,
								deletionRejectionReason: null,
								deletionRejectedAt: null,
								restoreDeadline: null,
								purgeAfter: null,
								restoredAt: null,
								lastLoginAt: null,
								tokenVersion: { increment: 1 },
							},
						});

						if (updated.count !== 1) {
							return false;
						}

						await tx.session.deleteMany({ where: { userId: user.id } });

						await tx.adminChangeRequest.updateMany({
							where: {
								targetUserId: user.id,
								status: AdminChangeRequestStatus.PENDING,
							},
							data: {
								status: AdminChangeRequestStatus.REJECTED,
								reviewNote: "Account purged automatically.",
								reviewedAt: purgedAt,
								requestedPasswordHash: null,
							},
						});

						await tx.accountLifecycleEvent.create({
							data: {
								userId: user.id,
								type: AccountLifecycleEventType.PURGED,
								metadata: { method: "AUTOMATIC" },
							},
						});

						return true;
					});

					if (purged) {
						totalPurged += 1;
						successfulPurges += 1;

						if (user.imagePublicId) {
							await deleteCloudinaryImage(user.imagePublicId);
						}
					}
				} catch (error) {
					hadFailure = true;
					console.error(`Cron Job: Failed to purge account ${user.id}:`, error);
				}
			}

			if (hadFailure || successfulPurges === 0) {
				break;
			}
		}

		if (totalPurged > 0) {
			console.log(`Cron Job: Purged ${totalPurged} deleted account(s).`);
		}
	} catch (error) {
		console.error("Cron Job: Error while purging deleted accounts:", error);
	}

	return totalPurged;
};

export const purgeDeletedAccounts = async () => {
	cron.schedule(
		"0 3 * * *",
		async () => {
			await purgeExpiredAccounts();
		},
		{ timezone: "Asia/Dhaka" },
	);

	logger.info("Account purge cron schedule (daily at 03:00 Asia/Dhaka)");
};
