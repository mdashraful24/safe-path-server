import { Role } from "../../generated/prisma/client";
import config from "../../src/app/config";
import type { SeedAccount } from "./seed.types";

export const seedDemoUser = (): SeedAccount => ({
	label: "user",
	name: config.seed_user_name,
	email: config.seed_user_email,
	password: config.seed_user_password,
	role: Role.USER,
	imageUrl: "https://picsum.photos/seed/safepath-user/256/256",
});
