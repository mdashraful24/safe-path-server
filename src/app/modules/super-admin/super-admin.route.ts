import { Router } from "express";
import { requireAuth, requireSuperAdmin } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { SuperAdminController } from "./super-admin.controller";
import { superAdminValidation } from "./super-admin.validation";

const router = Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get("/admins", SuperAdminController.listAdmins);
router.patch(
	"/users/:userId/role",
	validateRequest(superAdminValidation.updateUserRole),
	SuperAdminController.updateUserRole,
);

router.get("/change-requests", SuperAdminController.getChangeRequests);
router.patch(
	"/change-requests/:requestId/approve",
	SuperAdminController.approveChangeRequest,
);
router.patch(
	"/change-requests/:requestId/reject",
	validateRequest(superAdminValidation.reject),
	SuperAdminController.rejectChangeRequest,
);

export const SuperAdminRoutes = router;
