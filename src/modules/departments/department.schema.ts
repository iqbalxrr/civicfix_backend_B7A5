import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(20).transform((v) => v.toUpperCase()),
  description: z.string().max(500).optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});
