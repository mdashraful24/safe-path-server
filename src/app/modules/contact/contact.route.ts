import { Router } from "express";
import { contactLimiter } from "../../middlewares/rateLimit";
import { validateRequest } from "../../middlewares/validateRequest";
import { ContactController } from "./contact.controller";
import { contactValidation } from "./contact.validation";

const router = Router();

router.post(
	"/",
	contactLimiter,
	validateRequest(contactValidation.create),
	ContactController.createContactMessage,
);

export const ContactRoutes = router;
