import { prisma } from "../../src/app/lib/prisma";
import { seedDatabase } from "../../src/app/utils/seed";

if (import.meta.main) {
	await seedDatabase();
	await prisma.$disconnect();
}
