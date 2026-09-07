import { Router } from "express";
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { getPublicStats } from "./stats.service";

const router = Router();

router.get(
  "/public",
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await getPublicStats();
    return sendSuccess(res, data, "Public stats fetched");
  }),
);

export default router;
