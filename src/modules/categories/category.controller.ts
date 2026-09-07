import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as categoryService from "./category.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.createCategory(req.body, req.user!.id);
  return sendSuccess(res, data, "Category created", 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = typeof req.query.departmentId === "string" ? req.query.departmentId : undefined;
  const data = await categoryService.listCategories(departmentId);
  return sendSuccess(res, data, "Categories fetched");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.getCategoryById(req.params.id);
  return sendSuccess(res, data, "Category fetched");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await categoryService.updateCategory(req.params.id, req.body, req.user!.id);
  return sendSuccess(res, data, "Category updated");
});
