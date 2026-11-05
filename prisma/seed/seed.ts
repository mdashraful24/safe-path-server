import { Prisma } from "../../generated/prisma/client";
import { Role } from "../../generated/prisma/enums";
import config from "../../src/app/config";
import { prisma } from "../../src/app/lib/prisma";
import logger from "../../src/app/logger";
import { AppError } from "../../src/app/utils/AppError";
import { hashPassword } from "../../src/app/utils/password";
import { demoIncidents } from "./seed.demo.incidents";
import type {
	SeedAccount,
	SeedAccountResult,
	SeedIncidentsResult,
} from "./seed.types";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const createSeedAccount = async (
	account: SeedAccount,
): Promise<SeedAccountResult> => {
	const name = account.name?.trim();
	const email = normalizeEmail(account.email);
	const password = account.password;

	if (!name || !email || !password) {
		throw new AppError(
			400,
			`${account.label} credentials are missing from the environment variables.`,
		);
	}

	const existing = await prisma.user.findUnique({
		where: { email },
		select: { id: true, role: true },
	});

	if (existing) {
		if (account.syncRole && existing.role !== account.role) {
			await prisma.user.update({
				where: { id: existing.id },
				data: { role: account.role },
			});
			logger.info(`${account.label} Role synced to ${account.role}`);
			return "existing";
		}

		logger.info(`${account.label} Already Exists!`);
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

		logger.info(`${account.label} Created`);
		return "created";
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			logger.info(`${account.label} Already Exists!`);
			return "existing";
		}

		logger.error(`Failed to create ${account.label}:`, error);
		throw error;
	}
};

export const seedSuperAdmin = (): Promise<SeedAccountResult> =>
	createSeedAccount({
		label: "Super Admin",
		name: config.seed_super_admin_name,
		email: config.seed_super_admin_email,
		password: config.seed_super_admin_password,
		role: Role.SUPER_ADMIN,
		imageUrl: "https://picsum.photos/seed/safepath-super-admin/256/256",
		syncRole: true,
	});

export const seedAdmin = (): Promise<SeedAccountResult> =>
	createSeedAccount({
		label: "Admin",
		name: config.seed_admin_name,
		email: config.seed_admin_email,
		password: config.seed_admin_password,
		role: Role.ADMIN,
		imageUrl: "https://picsum.photos/seed/safepath-admin/256/256",
		syncRole: true,
	});

export const seedDemoUser = (): Promise<SeedAccountResult> =>
	createSeedAccount({
		label: "Demo User",
		name: config.seed_user_name,
		email: config.seed_user_email,
		password: config.seed_user_password,
		role: Role.USER,
		imageUrl: "https://picsum.photos/seed/safepath-user/256/256",
	});

export const seedDemoIncidents = async (): Promise<SeedIncidentsResult> => {
	const reporter = await prisma.user.findUnique({
		where: { email: normalizeEmail(config.seed_user_email) },
		select: { id: true },
	});

	const admin = await prisma.user.findUnique({
		where: { email: normalizeEmail(config.seed_admin_email) },
		select: { id: true },
	});

	if (!reporter) {
		return { created: 0, existing: 0, skipped: demoIncidents.length };
	}

	let created = 0;
	let existing = 0;

	for (const incident of demoIncidents) {
		const current = await prisma.incident.findFirst({
			where: { title: incident.title, reporterId: reporter.id },
			select: { id: true },
		});

		if (current) {
			existing += 1;
			continue;
		}

		const reviewedById =
			incident.status === "PENDING" ? null : (admin?.id ?? null);

		const data: Prisma.IncidentUncheckedCreateInput = {
			title: incident.title,
			description: incident.description,
			category: incident.category,
			status: incident.status,
			area: incident.area,
			location: incident.location ?? null,
			latitude: incident.latitude ?? null,
			longitude: incident.longitude ?? null,
			incidentDate: incident.incidentDate,
			imageUrl: incident.imageUrl ?? null,
			reporterId: reporter.id,
			reviewedById,
			reviewedAt: reviewedById ? new Date() : null,
			reviewNote: reviewedById ? (incident.reviewNote ?? null) : null,
		};

		const createdIncident = await prisma.incident.create({ data });

		await prisma.incidentHistory.create({
			data: {
				incidentId: createdIncident.id,
				changedById: reviewedById ?? reporter.id,
				previousStatus: null,
				newStatus: incident.status,
				note: reviewedById
					? (incident.reviewNote ?? "Reviewed by a moderator.")
					: "Submitted by the reporter.",
			},
		});

		created += 1;
	}

	return { created, existing, skipped: 0 };
};

export const seedDatabase = async (): Promise<void> => {
	await seedSuperAdmin();
	await seedAdmin();
	await seedDemoUser();
	await seedDemoIncidents();
};
