import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as userService from "./user.service";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.getMe(req.user!.id);
  return sendSuccess(res, data, "Profile fetched");
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.updateMe(req.user!.id, req.body);
  return sendSuccess(res, data, "Profile updated");
});
