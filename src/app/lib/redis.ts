import { createClient } from "redis";
import config from "../config";

export const isRedisConfigured = Boolean(
	config.redis_host || config.redis_port,
);

export const redisClient = createClient({
	username: config.redis_user || undefined,
	password: config.redis_password || undefined,
	socket: {
		host: config.redis_host || "127.0.0.1",
		port: Number(config.redis_port) || 6379,
		reconnectStrategy: false,
	},
	disableOfflineQueue: true,
});

redisClient.on("error", (error: unknown) => {
	console.error(
		"Redis error:",
		error instanceof Error ? error.message : String(error),
	);
});

export const connectRedis = async (): Promise<void> => {
	if (redisClient.isOpen) return;
	await redisClient.connect();
};
