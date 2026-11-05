import { seedDatabase } from "./seed";
import { prisma } from "../../src/app/lib/prisma";

await seedDatabase();
await prisma.$disconnect();
