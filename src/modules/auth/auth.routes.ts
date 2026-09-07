import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middlewares/validate";
import * as authController from "./auth.controller";
import {
  googleAuthSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from "./auth.schema";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many auth attempts. Please try again later.",
    errors: [],
  },
});

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), authController.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), authController.login);
router.post("/google", authLimiter, validate({ body: googleAuthSchema }), authController.googleAuth);
router.post("/refresh-token", validate({ body: refreshTokenSchema }), authController.refresh);
router.post("/logout", validate({ body: refreshTokenSchema }), authController.logout);

export default router;
