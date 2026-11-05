import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
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

export const AdminRoutes = router;
