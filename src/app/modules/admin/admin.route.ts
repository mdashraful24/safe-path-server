import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { IncidentController } from "../incidents/incident.controller";
import { incidentValidation } from "../incidents/incident.validation";
import { AdminController } from "./admin.controller";
import { adminValidation } from "./admin.validation";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get("/users", AdminController.listUsers);
router.get("/users/deletion-requests", AdminController.getDeletionRequests);
router.get("/users/:userId", AdminController.getUserDetails);
router.patch(
	"/users/:userId/status",
	validateRequest(adminValidation.updateUserStatus),
	AdminController.updateUserStatus,
);
router.patch(
	"/users/deletion-requests/:userId/approve",
	AdminController.approveAccountDeletion,
);
router.patch(
	"/users/deletion-requests/:userId/reject",
	validateRequest(adminValidation.rejectDeletion),
	AdminController.rejectAccountDeletion,
);

router.post(
	"/change-requests",
	validateRequest(adminValidation.createChangeRequest),
	AdminController.createChangeRequest,
);

router.get("/incidents", IncidentController.listIncidentsForAdmin);
router.get("/incidents/:incidentId", IncidentController.getIncidentForAdmin);
router.patch(
	"/incidents/:incidentId/review",
	validateRequest(incidentValidation.review),
	IncidentController.reviewIncident,
);

export const AdminRoutes = router;
