import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { commentLimiter } from "../../middlewares/rateLimit";
import { validateRequest } from "../../middlewares/validateRequest";
import { CommentController } from "./comment.controller";
import { commentValidation } from "./comment.validation";

const router = Router({ mergeParams: true });

router.get("/", CommentController.listComments);

router.post(
	"/",
	requireAuth,
	commentLimiter,
	validateRequest(commentValidation.create),
	CommentController.createComment,
);

router.patch(
	"/:commentId",
	requireAuth,
	commentLimiter,
	validateRequest(commentValidation.update),
	CommentController.updateMyComment,
);

router.delete("/:commentId", requireAuth, CommentController.deleteMyComment);

export const CommentRoutes = router;
