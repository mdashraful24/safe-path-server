import { Router } from "express";
import { upload } from "../../lib/multer";
import { requireAuth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { IncidentController } from "./incident.controller";
import { incidentValidation } from "./incident.validation";

const router = Router();

router.post(
	"/",
	requireAuth,
	upload.single("image"),
	validateRequest(incidentValidation.create),
	IncidentController.createIncident,
);
router.get("/", IncidentController.listPublicIncidents);
router.get("/me", requireAuth, IncidentController.listMyIncidents);
router.get("/me/:incidentId", requireAuth, IncidentController.getMyIncident);
router.get("/:incidentId", IncidentController.getPublicIncident);

export const IncidentRoutes = router;
