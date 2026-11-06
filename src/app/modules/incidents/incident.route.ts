import { Router } from "express";
import { upload } from "../../lib/multer";
import { requireAuth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { CommentRoutes } from "../comments/comment.route";
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
router.get("/my-incidents", requireAuth, IncidentController.listMyIncidents);
router.get(
	"/my-incidents/:incidentId",
	requireAuth,
	IncidentController.getMyIncident,
);
router.patch(
	"/my-incidents/:incidentId",
	requireAuth,
	upload.single("image"),
	validateRequest(incidentValidation.update),
	IncidentController.updateMyIncident,
);
router.delete(
	"/my-incidents/:incidentId",
	requireAuth,
	IncidentController.deleteMyIncident,
);
router.use("/:incidentId/comments", CommentRoutes);
router.get("/:incidentId", IncidentController.getPublicIncident);

export const IncidentRoutes = router;
