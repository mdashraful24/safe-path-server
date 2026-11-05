import { Router } from "express";
import { requireAuth, requireSuperAdmin } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { SuperAdminController } from "./super-admin.controller";
import { superAdminValidation } from "./super-admin.validation";

const router = Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get("/users", SuperAdminController.listUsers);
router.get("/admins", SuperAdminController.listAdmins);
router.get("/users/:userId", SuperAdminController.getUserDetails);
router.patch(
	"/users/:userId/status",
	validateRequest(superAdminValidation.updateUserStatus),
	SuperAdminController.updateUserStatus,
);
router.patch(
	"/users/:userId/role",
	validateRequest(superAdminValidation.updateUserRole),
	SuperAdminController.updateUserRole,
);
router.patch(
	"/users/:userId/email",
	validateRequest(superAdminValidation.updateUserEmail),
	SuperAdminController.updateUserEmail,
);
router.patch(
	"/users/:userId/password",
	validateRequest(superAdminValidation.updateUserPassword),
	SuperAdminController.updateUserPassword,
);

router.get("/deletion-requests", SuperAdminController.getDeletionRequests);
router.patch(
	"/deletion-requests/:userId/approve",
	SuperAdminController.approveAccountDeletion,
);
router.patch(
	"/deletion-requests/:userId/reject",
	validateRequest(superAdminValidation.reject),
	SuperAdminController.rejectAccountDeletion,
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
