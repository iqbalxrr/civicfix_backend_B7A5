import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as paymentService from "./payment.service";

export const initiate = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentService.initiatePriorityPayment(req.user!.id, req.body.complaintId);
  return sendSuccess(res, data, "bKash payment initiated", 201);
});

export const callback = asyncHandler(async (req: Request, res: Response) => {
  const paymentID = String(req.query.paymentID || "");
  const status = req.query.status ? String(req.query.status) : undefined;
  if (!paymentID) {
    return res.status(400).json({
      success: false,
      message: "paymentID is required",
      errors: [],
    });
  }

  const data = await paymentService.handleBkashCallback(paymentID, status);
  return sendSuccess(res, data, "Payment callback processed");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentService.getPaymentById(req.params.id, req.user!.id, req.user!.role);
  return sendSuccess(res, data, "Payment fetched");
});

export const getByComplaint = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentService.getPaymentsByComplaint(
    req.params.complaintId,
    req.user!.id,
    req.user!.role,
  );
  return sendSuccess(res, data, "Complaint payments fetched");
});
