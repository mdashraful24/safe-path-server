import config from "../../src/app/config";
import type { SeedAccount } from "./seed.types";

export const userSeed = (): SeedAccount => ({
	label: "user",
	name: config.seed_user_name,
	email: config.seed_user_email,
	password: config.seed_user_password,
	role: "USER",
	imageUrl: "https://picsum.photos/seed/safepath-user/256/256",
});
