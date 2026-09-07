import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as complaintController from "./complaint.controller";
import {
  assignComplaintSchema,
  createComplaintSchema,
  feedbackSchema,
  listComplaintsQuerySchema,
  statusUpdateSchema,
  updateComplaintSchema,
} from "./complaint.schema";
import { z } from "zod";

const router = Router();

router.use(authenticate);

router.get(
  "/my-assigned",
  authorize(Role.STAFF, Role.ADMIN),
  complaintController.myAssigned,
);

router.post("/", authorize(Role.CITIZEN), validate({ body: createComplaintSchema }), complaintController.create);
router.get("/", validate({ query: listComplaintsQuerySchema }), complaintController.list);
router.get("/:id", complaintController.getById);
router.patch(
  "/:id",
  authorize(Role.CITIZEN, Role.ADMIN),
  validate({ body: updateComplaintSchema }),
  complaintController.update,
);
router.delete("/:id", authorize(Role.CITIZEN, Role.ADMIN), complaintController.remove);
router.post(
  "/:id/assign",
  authorize(Role.STAFF, Role.ADMIN),
  validate({ body: assignComplaintSchema }),
  complaintController.assign,
);
router.patch(
  "/:id/status",
  authorize(Role.STAFF, Role.ADMIN),
  validate({ body: statusUpdateSchema }),
  complaintController.updateStatus,
);
router.post(
  "/:id/cancel",
  authorize(Role.CITIZEN, Role.ADMIN, Role.STAFF),
  validate({ body: z.object({ note: z.string().max(1000).optional() }) }),
  complaintController.cancel,
);
router.post(
  "/:id/feedback",
  authorize(Role.CITIZEN),
  validate({ body: feedbackSchema }),
  complaintController.feedback,
);

export default router;
