import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import * as categoryController from "./category.controller";
import { createCategorySchema, updateCategorySchema } from "./category.schema";

const router = Router();

router.get("/", categoryController.list);
router.get("/:id", categoryController.getById);
router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  validate({ body: createCategorySchema }),
  categoryController.create,
);
router.patch(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  validate({ body: updateCategorySchema }),
  categoryController.update,
);

export default router;
