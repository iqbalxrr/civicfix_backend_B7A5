import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as authService from "./auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.registerUser(req.body);
  return sendSuccess(res, data, "Registration successful", 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.loginUser(req.body.email, req.body.password);
  return sendSuccess(res, data, "Login successful");
});

export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.googleLogin(req.body.idToken);
  return sendSuccess(res, data, "Google login successful");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.refreshTokens(req.body.refreshToken);
  return sendSuccess(res, data, "Token refreshed");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.logoutUser(req.body.refreshToken);
  return sendSuccess(res, data, "Logout successful");
});
