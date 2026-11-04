import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import httpStatus from "http-status";
import config from "./app/config";
import {
	globalErrorHandler,
	notFound,
} from "./app/middlewares/globalErrorHandler";

const app = express();

const trustProxy = Number(config.trust_proxy);

if (Number.isFinite(trustProxy) && trustProxy > 0) {
	app.set("trust proxy", trustProxy);
}

app.disable("x-powered-by");

app.use(compression());
app.use(helmet());

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
		methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
	}),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
	res.status(httpStatus.OK).json({
		success: true,
		statusCode: httpStatus.OK,
		message: "SafePath API is running.",
		data: { uptime: Math.round(process.uptime()) },
	});
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
