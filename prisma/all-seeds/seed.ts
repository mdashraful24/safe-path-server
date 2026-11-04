import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../src/app/lib/prisma";
import { hashPassword } from "../../src/app/utils/password";
import { adminSeed } from "./admin.seed";
import { seedIncidents } from "./incidents.seed";
import type { SeedAccount, SeedResult } from "./seed.types";
import { userSeed } from "./user.seed";

const seedAccount = async (
	account: SeedAccount,
): Promise<"created" | "existing"> => {
	const email = account.email.trim().toLowerCase();

	const current = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});

	if (current) {
		return "existing";
	}

	const passwordHash = await hashPassword(account.password);

	try {
		await prisma.user.create({
			data: {
				name: account.name,
				email,
				passwordHash,
				role: account.role,
				imageUrl: account.imageUrl,
				emailVerified: true,
				emailVerifiedAt: new Date(),
			},
		});
		return "created";
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return "existing";
		}
		throw error;
	}
};

export const seedUsers = async (): Promise<SeedResult> => {
	const accounts = [adminSeed(), userSeed()];
	const created: SeedAccount[] = [];
	const existing: SeedAccount[] = [];

	for (const account of accounts) {
		const result = await seedAccount(account);

		if (result === "created") created.push(account);
		else existing.push(account);
	}

	return { created, existing };
};

if (import.meta.main) {
	const users = await seedUsers();
	const incidents = await seedIncidents();

	console.log(`Seeded ${users.created.length} account(s).`);
	console.log(`Already present: ${users.existing.length}.`);
	console.log(`Incidents created: ${incidents.created}.`);
	console.log(`Incidents already present: ${incidents.existing}.`);
	console.log(`Incidents skipped: ${incidents.skipped}.`);

	await prisma.$disconnect();
}
