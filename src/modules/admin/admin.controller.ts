import type { Request, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { getPagination } from "../../utils/pagination";
import * as adminService from "./admin.service";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPagination(req);
  const role = req.query.role as Role | undefined;
  const search = req.query.search as string | undefined;
  const data = await adminService.listUsers(page, limit, role, search);
  return sendSuccess(res, data, "Users fetched");
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const data = await adminService.updateUserRole(req.params.id, req.user!.id, req.body);
  return sendSuccess(res, data, "User role updated");
});

export const dashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await adminService.getDashboardStats();
  return sendSuccess(res, data, "Dashboard stats fetched");
});

export const auditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPagination(req);
  const entityType = req.query.entityType as string | undefined;
  const data = await adminService.listAuditLogs(page, limit, entityType);
  return sendSuccess(res, data, "Audit logs fetched");
});
