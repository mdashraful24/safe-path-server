import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { DashboardController } from "./dashboard.controller";

const router = Router();

router.get("/overview", requireAuth, DashboardController.getOverview);

export const DashboardRoutes = router;
