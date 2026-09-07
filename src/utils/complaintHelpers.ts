import type { ComplaintStatus } from "@prisma/client";
import { ApiError } from "./ApiError";

const allowedTransitions: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED", "REJECTED"],
  UNDER_REVIEW: ["ASSIGNED", "REJECTED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "REJECTED", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "ASSIGNED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const assertStatusTransition = (from: ComplaintStatus, to: ComplaintStatus) => {
  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ApiError(400, `Invalid status transition from ${from} to ${to}`);
  }
};

export const generateTrackingId = (): string => {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CFX-${now}-${rand}`;
};
