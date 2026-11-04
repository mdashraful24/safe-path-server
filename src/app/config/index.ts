import path from "node:path";
import dotenv from "dotenv";
import { parseDuration } from "../utils/duration";

dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });

const optional = (key: string, fallback: string): string =>
	process.env[key]?.trim() || fallback;

const optionalNumber = (key: string, fallback: number): number => {
	const raw = process.env[key]?.trim();
	if (!raw) return fallback;
	const parsed = Number(raw);
	if (Number.isNaN(parsed)) {
		throw new Error(
			`Environment variable ${key} must be a number, got "${raw}"`,
		);
	}
	return parsed;
};

const nodeEnv = optional("NODE_ENV", "development");
const isProduction = nodeEnv === "production";

type SameSite = "lax" | "strict" | "none";

const parseSameSite = (raw: string): SameSite => {
	const value = raw.toLowerCase();
	if (value === "lax" || value === "strict" || value === "none") return value;
	throw new Error(
		`COOKIE_SAME_SITE must be one of "lax", "strict" or "none", got "${raw}"`,
	);
};

const config = {
	node_env: nodeEnv,
	is_production: isProduction,

	port: optionalNumber("PORT", 5001),
	api_prefix: optional("API_PREFIX", "/api"),

	database_url: optional("DATABASE_URL", ""),

	frontend_url: optional("FRONTEND_URL", "http://localhost:3000"),

	bcrypt_salt_rounds: optionalNumber("BCRYPT_SALT_ROUNDS", 12),

	jwt_access_secret: optional("JWT_ACCESS_SECRET", ""),
	jwt_refresh_secret: optional("JWT_REFRESH_SECRET", ""),
	jwt_access_expires_in: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
	jwt_refresh_expires_in: optional("JWT_REFRESH_EXPIRES_IN", "7d"),
	jwt_issuer: optional("JWT_ISSUER", "safepath-api"),
	jwt_audience: optional("JWT_AUDIENCE", "safepath-web"),

	cookie_domain: process.env.COOKIE_DOMAIN?.trim() || undefined,
	cookie_secure: process.env.COOKIE_SECURE
		? process.env.COOKIE_SECURE.trim().toLowerCase() === "true"
		: isProduction,
	cookie_same_site: parseSameSite(
		optional("COOKIE_SAME_SITE", isProduction ? "none" : "lax"),
	),

	trust_proxy: optionalNumber("TRUST_PROXY", 0),

	redis_user: optional("REDIS_USER", ""),
	redis_password: optional("REDIS_PASSWORD", ""),
	redis_host: optional("REDIS_HOST", "127.0.0.1"),
	redis_port: optionalNumber("REDIS_PORT", 6379),

	smtp_user: optional("SMTP_USER", ""),
	smtp_password: optional("SMTP_PASSWORD", ""),
	email_sender: optional("EMAIL_SENDER", ""),

	cloudinary_cloud_name: optional("CLOUDINARY_CLOUD_NAME", ""),
	cloudinary_api_key: optional("CLOUDINARY_API_KEY", ""),
	cloudinary_api_secret: optional("CLOUDINARY_API_SECRET", ""),

	otp_expires_in_seconds: optionalNumber("OTP_EXPIRES_IN_SECONDS", 120),
	registration_session_expires_in_seconds: optionalNumber(
		"REGISTRATION_SESSION_EXPIRES_IN_SECONDS",
		300,
	),

	seed_on_start: optional("SEED_ON_START", "false").toLowerCase() === "true",
	seed_admin_name: optional("SEED_ADMIN_NAME", "SafePath Admin"),
	seed_admin_email: optional("SEED_ADMIN_EMAIL", "admin@safepath.local"),
	seed_admin_password: optional("SEED_ADMIN_PASSWORD", "Admin@12345"),
	seed_user_name: optional("SEED_USER_NAME", "SafePath Demo User"),
	seed_user_email: optional("SEED_USER_EMAIL", "user@safepath.local"),
	seed_user_password: optional("SEED_USER_PASSWORD", "User@12345"),
};

export const assertRuntimeConfig = () => {
	const missing: string[] = [];

	if (!config.database_url) missing.push("DATABASE_URL");
	if (!config.jwt_access_secret) missing.push("JWT_ACCESS_SECRET");
	if (!config.jwt_refresh_secret) missing.push("JWT_REFRESH_SECRET");

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variable(s): ${missing.join(", ")}. ` +
				"Copy .env.example to .env and fill in the values.",
		);
	}

	if (config.jwt_access_secret === config.jwt_refresh_secret) {
		throw new Error(
			"JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.",
		);
	}

	if (
		config.jwt_access_secret.length < 32 ||
		config.jwt_refresh_secret.length < 32
	) {
		throw new Error(
			"JWT secrets must be at least 32 characters long. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
		);
	}

	if (config.bcrypt_salt_rounds < 10 || config.bcrypt_salt_rounds > 15) {
		throw new Error("BCRYPT_SALT_ROUNDS must be between 10 and 15.");
	}

	if (!Number.isInteger(config.port) || config.port <= 0) {
		throw new Error("PORT must be a positive integer.");
	}

	if (config.cookie_same_site === "none" && !config.cookie_secure) {
		throw new Error(
			'COOKIE_SAME_SITE="none" requires COOKIE_SECURE="true" (browsers reject SameSite=None without Secure).',
		);
	}

	if (config.otp_expires_in_seconds <= 0) {
		throw new Error("OTP_EXPIRES_IN_SECONDS must be a positive integer.");
	}

	if (
		config.registration_session_expires_in_seconds <
		config.otp_expires_in_seconds
	) {
		throw new Error(
			"REGISTRATION_SESSION_EXPIRES_IN_SECONDS must be greater than or equal to OTP_EXPIRES_IN_SECONDS.",
		);
	}

	if (!Number.isInteger(config.redis_port) || config.redis_port <= 0) {
		throw new Error("REDIS_PORT must be a positive integer.");
	}

	const cloudinaryValues = [
		config.cloudinary_cloud_name,
		config.cloudinary_api_key,
		config.cloudinary_api_secret,
	];
	const configuredCloudinaryValues = cloudinaryValues.filter(Boolean).length;

	if (
		configuredCloudinaryValues > 0 &&
		configuredCloudinaryValues < cloudinaryValues.length
	) {
		throw new Error(
			"CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set together.",
		);
	}

	if (isProduction) {
		const missingEmail: string[] = [];
		if (!config.smtp_user) missingEmail.push("SMTP_USER");
		if (!config.smtp_password) missingEmail.push("SMTP_PASSWORD");
		if (!config.email_sender) missingEmail.push("EMAIL_SENDER");

		if (missingEmail.length > 0) {
			throw new Error(
				`Missing required environment variable(s) for email delivery: ${missingEmail.join(", ")}.`,
			);
		}
	}

	const durations: Array<[string, string]> = [
		["JWT_ACCESS_EXPIRES_IN", config.jwt_access_expires_in],
		["JWT_REFRESH_EXPIRES_IN", config.jwt_refresh_expires_in],
	];

	for (const [key, value] of durations) {
		try {
			parseDuration(value);
		} catch (error) {
			throw new Error(
				`${key} is invalid: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
};

export default config;
