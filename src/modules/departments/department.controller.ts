import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as departmentService from "./department.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await departmentService.createDepartment(req.body, req.user!.id);
  return sendSuccess(res, data, "Department created", 201);
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await departmentService.listDepartments();
  return sendSuccess(res, data, "Departments fetched");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await departmentService.getDepartmentById(req.params.id);
  return sendSuccess(res, data, "Department fetched");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await departmentService.updateDepartment(req.params.id, req.body, req.user!.id);
  return sendSuccess(res, data, "Department updated");
});
