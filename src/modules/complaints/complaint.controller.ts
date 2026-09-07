import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { getPagination } from "../../utils/pagination";
import * as complaintService from "./complaint.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.createComplaint(req.user!.id, req.body);
  return sendSuccess(res, data, "Complaint created", 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPagination(req);
  const data = await complaintService.listComplaints(req.user!, {
    page,
    limit,
    status: req.query.status as never,
    priority: req.query.priority as never,
    departmentId: req.query.departmentId as string | undefined,
    categoryId: req.query.categoryId as string | undefined,
    search: req.query.search as string | undefined,
    sortBy: req.query.sortBy as never,
    sortOrder: req.query.sortOrder as never,
  });
  return sendSuccess(res, data, "Complaints fetched");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.getComplaintById(req.params.id, req.user!);
  return sendSuccess(res, data, "Complaint fetched");
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.updateComplaint(req.params.id, req.user!, req.body);
  return sendSuccess(res, data, "Complaint updated");
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.softDeleteComplaint(req.params.id, req.user!);
  return sendSuccess(res, data, "Complaint soft-deleted");
});

export const assign = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.assignComplaint(
    req.params.id,
    req.user!,
    req.body.staffId,
    req.body.note,
  );
  return sendSuccess(res, data, "Complaint assigned");
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.updateComplaintStatus(
    req.params.id,
    req.user!,
    req.body.status,
    req.body.note,
    req.body.rejectionReason,
  );
  return sendSuccess(res, data, "Complaint status updated");
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.cancelComplaint(req.params.id, req.user!, req.body.note);
  return sendSuccess(res, data, "Complaint cancelled");
});

export const myAssigned = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = getPagination(req);
  const data = await complaintService.getMyAssigned(req.user!.id, page, limit);
  return sendSuccess(res, data, "Assigned complaints fetched");
});

export const feedback = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.submitFeedback(
    req.params.id,
    req.user!.id,
    req.body.rating,
    req.body.comment,
  );
  return sendSuccess(res, data, "Feedback submitted", 201);
});
