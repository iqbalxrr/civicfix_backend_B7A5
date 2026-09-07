import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as userController from "./user.controller";
import { updateProfileSchema } from "./user.schema";

const router = Router();

router.get("/me", authenticate, userController.getMe);
router.patch("/me", authenticate, validate({ body: updateProfileSchema }), userController.updateMe);

export default router;
