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
import { AdminRoutes } from "./app/modules/admin/admin.route";
import { AuthRoutes } from "./app/modules/auth/auth.route";
import { ContactRoutes } from "./app/modules/contact/contact.route";
import { DashboardRoutes } from "./app/modules/dashboard/dashboard.route";
import { IncidentRoutes } from "./app/modules/incidents/incident.route";
import { SuperAdminRoutes } from "./app/modules/super-admin/super-admin.route";
import { UserRoutes } from "./app/modules/user/user.route";

const app = express();

const apiPrefix = (() => {
	const raw = (config.api_prefix || "/api/v1").trim();

	if (!raw || raw === "/") return "";

	return `/${raw.replace(/^\/+|\/+$/g, "")}`;
})();

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

app.use(`${apiPrefix}/auth`, AuthRoutes);
app.use(`${apiPrefix}/contact`, ContactRoutes);
app.use(`${apiPrefix}/users`, UserRoutes);
app.use(`${apiPrefix}/dashboard`, DashboardRoutes);
app.use(`${apiPrefix}/incidents`, IncidentRoutes);
app.use(`${apiPrefix}/admin`, AdminRoutes);
app.use(`${apiPrefix}/super-admin`, SuperAdminRoutes);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
