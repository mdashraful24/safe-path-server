import { defineConfig } from "prisma/config";
import config from "./src/app/config";

export default defineConfig({
	schema: "prisma/schema",
	migrations: {
		path: "prisma/migrations",
	},
	datasource: {
		url: config.database_url,
	},
});
