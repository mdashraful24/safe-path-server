import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
	node_env: process.env.NODE_ENV,
	port: process.env.PORT,
	database_url: process.env.DATABASE_URL,
	frontend_url: process.env.FRONTEND_URL,
	api_prefix: process.env.API_PREFIX,
	trust_proxy: process.env.TRUST_PROXY,

	bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,

	jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
	jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
	jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN!,
	jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN!,

	google_client_id: process.env.GOOGLE_CLIENT_ID,

	cookie_same_site: process.env.COOKIE_SAME_SITE!,
	cookie_secure: process.env.COOKIE_SECURE!,

	redis_user: process.env.REDIS_USER!,
	redis_password: process.env.REDIS_PASSWORD!,
	redis_host: process.env.REDIS_HOST!,
	redis_port: process.env.REDIS_PORT!,

	smtp_user: process.env.SMTP_USER!,
	smtp_password: process.env.SMTP_PASSWORD!,
	email_sender: process.env.EMAIL_SENDER!,

	cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
	cloudinary_api_key: process.env.CLOUDINARY_API_KEY!,
	cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET!,

	otp_expires_in_seconds: process.env.OTP_EXPIRES_IN_SECONDS!,
	registration_session_expires_in_seconds:
		process.env.REGISTRATION_SESSION_EXPIRES_IN_SECONDS!,

	account_restore_grace_days: process.env.ACCOUNT_RESTORE_GRACE_DAYS || "30",
	account_deletion_retention_days:
		process.env.ACCOUNT_DELETION_RETENTION_DAYS || "90",
	account_purge_batch_size: process.env.ACCOUNT_PURGE_BATCH_SIZE || "100",

	seed_on_start: process.env.SEED_ON_START!,
	seed_super_admin_name: process.env.SEED_SUPER_ADMIN_NAME!,
	seed_super_admin_email: process.env.SEED_SUPER_ADMIN_EMAIL!,
	seed_super_admin_password: process.env.SEED_SUPER_ADMIN_PASSWORD!,
	seed_admin_name: process.env.SEED_ADMIN_NAME!,
	seed_admin_email: process.env.SEED_ADMIN_EMAIL!,
	seed_admin_password: process.env.SEED_ADMIN_PASSWORD!,
	seed_user_name: process.env.SEED_USER_NAME!,
	seed_user_email: process.env.SEED_USER_EMAIL!,
	seed_user_password: process.env.SEED_USER_PASSWORD!,
};
