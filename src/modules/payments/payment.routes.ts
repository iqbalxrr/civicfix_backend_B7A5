import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as paymentController from "./payment.controller";
import { initiatePaymentSchema } from "./payment.schema";

const router = Router();

router.get("/callback", paymentController.callback);

router.post(
  "/initiate",
  authenticate,
  authorize(Role.CITIZEN),
  validate({ body: initiatePaymentSchema }),
  paymentController.initiate,
);

router.get("/complaint/:complaintId", authenticate, paymentController.getByComplaint);
router.get("/:id", authenticate, paymentController.getById);

export default router;
