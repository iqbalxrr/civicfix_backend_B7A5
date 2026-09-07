import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as departmentController from "./department.controller";
import { createDepartmentSchema, updateDepartmentSchema } from "./department.schema";

const router = Router();

router.get("/", departmentController.list);
router.get("/:id", departmentController.getById);
router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  validate({ body: createDepartmentSchema }),
  departmentController.create,
);
router.patch(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  validate({ body: updateDepartmentSchema }),
  departmentController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  departmentController.softDelete,
);

export default router;
