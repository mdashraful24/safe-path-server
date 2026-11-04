import config from "../../src/app/config";
import type { SeedAccount } from "./seed.types";

export const adminSeed = (): SeedAccount => ({
	label: "admin",
	name: config.seed_admin_name,
	email: config.seed_admin_email,
	password: config.seed_admin_password,
	role: "ADMIN",
	imageUrl: "https://picsum.photos/seed/safepath-admin/256/256",
});
