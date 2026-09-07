import { ComplaintStatus, Priority } from "@prisma/client";
import { z } from "zod";

export const createComplaintSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  categoryId: z.string().min(1),
  location: z.string().min(3).max(255),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  priority: z.nativeEnum(Priority).default(Priority.STANDARD),
  attachmentUrls: z.array(z.string().url()).max(5).optional(),
});

export const updateComplaintSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  location: z.string().min(3).max(255).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const assignComplaintSchema = z.object({
  staffId: z.string().min(1),
  note: z.string().max(1000).optional(),
});

export const statusUpdateSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  note: z.string().max(1000).optional(),
  rejectionReason: z.string().max(1000).optional(),
});

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const listComplaintsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(ComplaintStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  departmentId: z.string().optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "slaDueAt", "priority"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
