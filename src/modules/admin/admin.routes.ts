import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as adminController from "./admin.controller";
import { updateRoleSchema } from "./admin.service";

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));

router.get("/users", adminController.listUsers);
router.patch(
  "/users/:id/role",
  validate({ body: updateRoleSchema }),
  adminController.updateRole,
);
router.get("/dashboard-stats", adminController.dashboardStats);
router.get("/audit-logs", adminController.auditLogs);

export default router;
