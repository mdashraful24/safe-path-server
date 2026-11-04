import { Prisma } from "../../../generated/prisma/client";
import { seedSuperAdmin as buildSuperAdmin } from "../../../prisma/all-seeds/admin.seed";
import { seedIncidents } from "../../../prisma/all-seeds/incidents.seed";
import type {
	SeedAccount,
	SeedAccountResult,
	SeedIncidentsResult,
} from "../../../prisma/all-seeds/seed.types";
import { seedDemoUser as buildDemoUser } from "../../../prisma/all-seeds/user.seed";
import logger from "../logger";
import { prisma } from "../lib/prisma";
import { AppError } from "./AppError";
import { hashPassword } from "./password";

const createSeedAccount = async (
	account: SeedAccount,
	label: string,
): Promise<SeedAccountResult> => {
	const name = account.name?.trim();
	const email = account.email?.trim().toLowerCase();
	const password = account.password;

	if (!name || !email || !password) {
		throw AppError.badRequest(
			`${label} credentials are missing from the environment variables.`,
		);
	}

	const existing = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});

	if (existing) {
		logger.info(`${label} Already Exists!`);
		return "existing";
	}

	try {
		await prisma.user.create({
			data: {
				name,
				email,
				passwordHash: await hashPassword(password),
				role: account.role,
				imageUrl: account.imageUrl,
				emailVerified: true,
				emailVerifiedAt: new Date(),
			},
		});

		logger.info(`${label} Created`);
		return "created";
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			logger.info(`${label} Already Exists!`);
			return "existing";
		}

		logger.error(`Failed to create ${label}:`, error);
		throw error;
	}
};

export const seedSuperAdmin = (): Promise<SeedAccountResult> =>
	createSeedAccount(buildSuperAdmin(), "Super Admin");

export const seedDemoUser = (): Promise<SeedAccountResult> =>
	createSeedAccount(buildDemoUser(), "Demo User");

export const seedDemoIncidents = async (): Promise<SeedIncidentsResult> => {
	const result = await seedIncidents();

	logger.info(
		`Incidents seeded: ${result.created} created, ${result.existing} already existed, ${result.skipped} skipped.`,
	);

	return result;
};

export const seedDatabase = async (): Promise<void> => {
	await seedSuperAdmin();
	await seedDemoUser();
	await seedDemoIncidents();
};
